import { initBuffers } from "./init-buffers.js";
import { drawScene } from "./draw-scene.js";
import { setPositionAttribute } from "./draw-scene.js";
import { setTextureAttribute } from "./draw-scene.js";
main();

let deltaTime = 0;





function main()
{
    const vsSource = 
    `#version 300 es
    in vec4 aVertexPosition;
    in vec2 aTextureCoord;
    out vec2 vTextureCoord;
    void main() {
      gl_Position = vec4(aVertexPosition.x, aVertexPosition.y, 0.0, 1.0);
      vTextureCoord = aTextureCoord;
    }
    `;
 /**/
    const fsSource = 
    `#version 300 es
    in highp vec2 vTextureCoord;
    uniform sampler2D uSampler;
    out highp vec4 outColor;

    void main(void) {
      outColor = texture(uSampler, vTextureCoord);
    }
    `;

    //TODO Keep Updating to Use new Approach, draw color based on 2d array
    const fsSource2 =  //updating here to use 2D arrays 
    `#version 300 es
    in highp vec2 vTextureCoord;
    uniform sampler2D uSampler;

    uniform highp float xArray[100];
    uniform highp float yArray[100];

    uniform int xPosition;
    uniform int yPosition;

    out highp vec4 outColor;

    void main(void) {

      highp float fxPosition = gl_FragCoord.x;
      highp float fyPosition = gl_FragCoord.y;


      //magic number, we know width is 100
      int targetPosition = xPosition / 10;
      int targetPositionY = yPosition / 10;

      int yoffSet = int(gl_FragCoord.y) / 10;
      int newTarget  = yoffSet*10 + (int(gl_FragCoord.x) / 10);

      //TODO NOW ADD Y VALUE TO GREEN
      highp float xValue = (xArray[newTarget]);
      highp float yValue = (yArray[newTarget]);

      outColor = vec4(xValue, yValue, 0.0, 1.0);
    }
    `;

    const vsSource2 = 
    `#version 300 es
    in vec4 aVertexPosition;
    in vec2 aTextureCoord;
    out highp vec2 vTextureCoord;
    void main() {
      gl_Position = vec4(aVertexPosition.x, aVertexPosition.y, 0.0, 1.0);
      vTextureCoord = aTextureCoord;
    }`;


    const fsSourceBlank = 
    `#version 300 es
    in highp vec2 vTextureCoord;
    uniform sampler2D uSampler;
    out highp vec4 outColor;
    void main(void) {
      outColor = vec4(0.0, 0.0, 0.0, 1.0);
    }
    `;

    const vsParticle = 
    `#version 300 es
    in vec3 aVertexPosition;
    out vec3 outPosition;
    uniform highp float xArray[100];
    uniform highp float yArray[100];
    void main() {
      

      highp float normalizedX = aVertexPosition.x + 1.0; 
      highp float normalizedY = aVertexPosition.y + 1.0;

      //magic number 0.2, is the cell width ie 10 cells / range of 2 in coordinates = 0.2
      int xCell = int(normalizedX / 0.2);
      int yCell = int(normalizedY / 0.2);
      //yCell = 10 - yCell;

      //if returns 0 at end so add ! to return true at end
      // in coord system (-) is bottom so invert so smaller number on top
      //highp float normalizedY =  2.0 - (aVertexPosition.y + 1.0);



      //do row length * y cell to get right row then offset into it with x 
      //magic number row length is 10
      int targetCell = (10 * yCell) + xCell;  

      bool lastCell = (targetCell % 10) != 0;
      int nextCell = targetCell + (int(lastCell));

      highp float xMovement = (xArray[targetCell] + xArray[nextCell])*0.5;
      highp float yMovement = (yArray[targetCell] + yArray[nextCell])*0.5; 

      gl_PointSize = 2.0;
      gl_Position = vec4(aVertexPosition, 1.0);
      gl_Position.x = gl_Position.x + xMovement;
      gl_Position.y = gl_Position.y + yMovement;
      outPosition = aVertexPosition;
      outPosition.x = outPosition.x + xMovement;
      outPosition.y = outPosition.y + yMovement;
    }
    `;

    const fsParticle = 
    `#version 300 es
    out highp vec4 outColor;
    void main(void) {
      outColor = vec4(0.0, 0.0, 1.0, 1.0);
    }
    `;



    //grab canvas and make webgl context
    const canvas = document.querySelector("#glcanvas");
    const gl = canvas.getContext("webgl2");
    const buffers = initBuffers(gl);
    const offset = 0;
    const vertexCount = 6;
    var mouseDown = false;

    //values for canvas 
    var canvasWidth = canvas.width;
    var canvasHeight = canvas.height; 
    var res = 10; 
    var cellPixelWidth = canvas.width / res; 

    var mouseStartX = 0.0;
		var mouseStartY = 0.0;
    var sceneDT = 1.0 / 60.0;


    class Fluid {
      constructor(numX, numY) {
        this.rowCount = numY + 2;
        this.columnCount = numX + 2;
        this.numCells = numX * numY;
        this.u = new Array(this.numCells);
        //X Velocities
        for(var i = 0; i < this.u.length; i++)
        {
          var val = i % 10;

          this.u[i] = (val * 0.0);
        }
        //this.u[0] = 0.5;

        //Y Velocities
        this.v = new Array(this.numCells);
        for(var i = 0; i < this.v.length; i++)
        {
          var val = i % 10;

          //this.v[i] = 0.0; //y velocities
          this.v[i] = (val * 0.0);
        }
        //Solid = 0 , Open = 1
        this.s = new Array(this.rowCount);
        for(var i = 0; i < this.rowCount; i++)
        {
          this.s[i] = new Float32Array(this.columnCount).fill(1.0);
        } 
        //Pressure Values 
        this.p = new Array(this.rowCount);
        for(var i = 0; i < this.rowCount; i++)
        {
          this.p[i] = new Float32Array(this.columnCount).fill(0.0);
        }
        
        //fill border around vector field with 1s 
        for(var i = 0; i < this.columnCount; i++)
        {
          this.s[i][this.columnCount-1] = 0.0;
          this.s[i][this.columnCount-2] = 0.0;
          
          this.s[0][i] = 0.0;
          this.s[1][i] = 0.0;
    
          this.s[i][0] = 0.0;
          this.s[i][1] = 0.0;
          this.s[i][2] = 0.0;
    
    
          this.s[this.rowCount - 2][i] = 0.0;
          this.s[this.rowCount - 1][i] = 0.0;
        }
        //var num = numX * numY;
    
        //new X velocities
        this.newU = new Array(this.rowCount);
        for(var i = 0; i < this.rowCount; i++)
        {
          this.newU[i] = new Float32Array(this.columnCount).fill(-0.1);
        }
        //New Y Velocities
        this.newV = new Array(this.rowCount);
        for(var i = 0; i < this.rowCount; i++)
        {
          this.newV[i] = new Float32Array(this.columnCount).fill(-0.1); //y velocities
        }
      }
    }


    let fluid = new Fluid(res, res);


    
    if(gl == null){
        alert("Unable to do webgl");
        return;
    }
    gl.clearColor(0.0,0.0,0.0,1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    const shaderProgram = initShaderProgram(gl,vsSource, fsSource);
    
    const programInfo = {
        program: shaderProgram,
        attribLocations: {
            vertexPosition: gl.getAttribLocation(shaderProgram, "aVertexPosition"),
            textureCoord:  gl.getAttribLocation(shaderProgram, "aTextureCoord")
        },
        uniformLocations: {
            projectionMatrix: 
                gl.getUniformLocation(shaderProgram, "uProjectionMatrix"),
            modelViewMatrix:
                gl.getUniformLocation(shaderProgram, "uModelViewMatrix"),
            uSampler:gl.getUniformLocation(shaderProgram, "uSampler"),
        }
    }

    const shaderProgram2 = initShaderProgram(gl,vsSource2, fsSource2);

    const programInfo2 = {
        program: shaderProgram2,
        attribLocations: {
            vertexPosition: gl.getAttribLocation(shaderProgram2, "aVertexPosition"),
            textureCoord:  gl.getAttribLocation(shaderProgram2, "aTextureCoord")
        },
        uniformLocations: { }
    }

    const shaderProgram3 = initShaderProgram(gl,vsSource, fsSourceBlank);
    const programInfo3 = {
      program: shaderProgram3,
      attribLocations: {
          vertexPosition: gl.getAttribLocation(shaderProgram3, "aVertexPosition"),
          textureCoord:  gl.getAttribLocation(shaderProgram3, "aTextureCoord")
      },
      uniformLocations: { }
  }


  const shaderProgramParticle = gl.createProgram();

   const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsParticle);
   const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsParticle);

   //create shader program as usual
   gl.transformFeedbackVaryings(shaderProgramParticle, ['outPosition'], gl.SEPARATE_ATTRIBS);
   gl.attachShader(shaderProgramParticle, vertexShader);
   gl.attachShader(shaderProgramParticle, fragmentShader);
   gl.linkProgram(shaderProgramParticle);

   //if failed, alert 
   if(!gl.getProgramParameter(shaderProgramParticle, gl.LINK_STATUS))
   {
       alert("Failed Manual LInking of particle shader.");
   }


   const programInfoParticle = {
    program: shaderProgramParticle,
    attribLocations: {
        vertexPosition: gl.getAttribLocation(shaderProgramParticle, "aVertexPosition"),
    },
    uniformLocations: { }
}

    //do texture update here 
    //need shader program for filling 
    //const buffers = initBuffers(gl);
    const texture = loadTexture(gl, "Untitled.png");
    const secondTexture = loadTexture(gl, "Untitled.png");



    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    const attachmentPoint = gl.COLOR_ATTACHMENT0;
    const textureType = gl.TEXTURE_2D;
    gl.framebufferTexture2D(gl.FRAMEBUFFER, attachmentPoint, 
      textureType, texture, 0);

    const fb2 = gl.createFramebuffer(); 
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb2);
    gl.framebufferTexture2D( gl.FRAMEBUFFER, attachmentPoint, 
    gl.TEXTURE_2D, secondTexture, 0);


    //make sure both textures are blank for velocity 
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.viewport(0,0, 10,10);
    gl.useProgram(programInfo3.program)
    setPositionAttribute(gl, buffers, programInfo3);
    setTextureAttribute(gl, buffers, programInfo3);
    gl.drawArrays(gl.TRIANGLES, offset, vertexCount);

    gl.bindFramebuffer(gl.FRAMEBUFFER, fb2);
    gl.viewport(0,0, 10,10);
    gl.useProgram(programInfo3.program)
    setPositionAttribute(gl, buffers, programInfo3);
    setTextureAttribute(gl, buffers, programInfo3);
    gl.drawArrays(gl.TRIANGLES, offset, vertexCount);

    //reset to canvas output 
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    //setup drawing particles
    let then = 0;
    const PARTICLE_COUNT = 1;
    var particlePositions = [ -0.5, 0.58, 0.0];
    gl.useProgram(programInfoParticle.program)
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(particlePositions),gl.STATIC_DRAW); 
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(0);


    //setup Transform feedback and buffer to receive positions
    var returnedVertexArray = gl.createVertexArray();
    gl.bindVertexArray(returnedVertexArray);
    var returnedPositions = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, returnedPositions);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array( particlePositions), gl.STREAM_COPY);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(0);

    gl.bindVertexArray(null);
    var transformFeedback = gl.createTransformFeedback();
    gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, transformFeedback);
    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, returnedPositions);
    /* End Transform feedback*/

    //Render texture and particle 
    function render(now) {
      now *= 0.001; // convert to seconds
      deltaTime = now - then;
      then = now;
  
      //draw texture 
      //drawScene(gl, programInfo, buffers, texture);
             //update secondTexture with 1st Texture + position painted red 
      //gl.bindFramebuffer(gl.FRAMEBUFFER, fb2);
      gl.clearColor(0.0, 0.0, 0.0, 1.0);
      gl.clearDepth (1.0);
      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LEQUAL);
  
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      
      gl.viewport(0,0, 100,100);
      gl.useProgram(programInfo2.program)
      setPositionAttribute(gl, buffers, programInfo2);
      setTextureAttribute(gl, buffers, programInfo2);
      var targetCopy = gl.getUniformLocation(programInfo2.program, "uSampler");
      gl.uniform1i(targetCopy, 0);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);


      //Pass x and y velocity as 2D uniform 
      const uniformLocation1 = gl.getUniformLocation(programInfo2.program, 'xArray');
      gl.uniform1fv(uniformLocation1, fluid.u);
      const uniformLocation3 = gl.getUniformLocation(programInfo2.program, 'yArray');
      gl.uniform1fv(uniformLocation3, fluid.v);
      gl.drawArrays(gl.TRIANGLES, offset, vertexCount);


      //DRAW PARTICE, also setup transform to feedback 
      gl.useProgram(programInfoParticle.program)
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
      gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

      //Pass x and y velocity as 2D uniform 
      const uniformLocation = gl.getUniformLocation(programInfoParticle.program, 'xArray');
      const flattenedArray = fluid.u.flat(); 
      //console.log("FLATTENED SIZE {}", flattenedArray.length);
      gl.uniform1fv(uniformLocation, fluid.u);

      const uniformLocation2 = gl.getUniformLocation(programInfoParticle.program, 'yArray');
      const flattenedArray2 = fluid.v.flat(); 
      //console.log("FLATTENED SIZE {}", flattenedArray2.length);
      gl.uniform1fv(uniformLocation2, fluid.v);


      gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, transformFeedback);
      gl.beginTransformFeedback(gl.POINTS);
      gl.drawArrays(gl.POINTS, 0, PARTICLE_COUNT);
      gl.endTransformFeedback();
     
      //get output of new particle positions and store into array      
      const outputData = new Float32Array(particlePositions);
      gl.getBufferSubData(gl.TRANSFORM_FEEDBACK_BUFFER, 0, outputData);
      //put outputdata back into buffer to be used 
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(outputData),gl.STATIC_DRAW);

      requestAnimationFrame(render);
    }

    function startDrag(x,y){
      mouseDown=true;
      setObstacle(x,y,true);
    }

    function endDrag() {
      mouseDown = false;
    }

    function drag(x, y) {
      if (mouseDown) {
        setObstacle(x,y, false);
      }
    }

    canvas.addEventListener('mousemove', event => {
      drag(event.x, event.y);
    });

    canvas.addEventListener('mousedown', event => {
      startDrag(event.x, event.y);
    });

    canvas.addEventListener('mouseup', event => {
      endDrag();      
    });


    function convertToPixelCoordinate(index, cellWidth, coordType)
    {
      //todo 10 a magic number, investigate why + 1 on math 
      var xIndex = (index % 10) + 1;
      var yIndex = 10 - Math.floor(index / 10);
      var pixelX = 0;
      var pixelY = 0;
      if(coordType == 'u')
      {       
        pixelX = Math.floor(xIndex * cellWidth); 
        pixelY = Math.floor( (yIndex * cellWidth) + (cellWidth/2.0));
        return [pixelX, pixelY];
      }
      else
      {
        pixelX = Math.floor(xIndex * cellWidth + (cellWidth/2.0)); 
        pixelY = Math.floor(yIndex * cellWidth);
        return [pixelX, pixelY];
      }
    }


    function setObstacle(x,y,reset)
	  {
      console.log(x - 7);
 


      //need to update velocity field based on drag
      //simple first, if in  area, make -0.1 
      //probably doesnt need to go to gpu, just updating one location 
      //HERE
      var velocityX = 0.0;
      var velocityY = 0.0;
      if(!reset)
      {
        velocityX = (x - mouseStartX)/sceneDT;
        velocityY = (y - mouseStartY)/sceneDT;
      }
      mouseStartX = x;
      mouseStartY = y;
      var mouseRadius = 0.15;

      //iterate over every cell in 
      for(var i = 0; i < fluid.u.length; ++i)
      {
        var uPixelCoord = convertToPixelCoordinate(i, cellPixelWidth,'u');
				var vPixelCoord = convertToPixelCoordinate(i, cellPixelWidth,'v');
      
        var uDistance = Math.sqrt(
          Math.pow( (uPixelCoord[0] - x),2) 
          + 
          Math.pow( (uPixelCoord[1] - y),2));

        var vDistance = Math.sqrt(
            Math.pow( (vPixelCoord[0] - x),2) 
            + 
            Math.pow( (vPixelCoord[1] - y),2));

        //check u first
        if(	uDistance < 5  /*&& scene.fluid.s[i][j] != 0.0 && scene.fluid.s[i][j-1] != 0.0*/ )  
        {
          fluid.u[i] = 0.001 * velocityX;
        } 
        if(vDistance < 5 /*&& scene.fluid.s[i][j] != 0.0 && scene.fluid.s[i-1][j] != 0.0*/)
        {
          fluid.v[i] = - 0.001 * velocityY;
        }
      }

      //go back to rendering normal 
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
	  }

    requestAnimationFrame(render);

   //drawScene(gl, programInfo, buffers, texture);
    
}//iterate over the values in the pixel locations 

function initShaderProgram(gl, vsSource, fsSource)
{
    const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

    //create shader program as usual
    const shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    //if failed, alert 
    if(!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS))
    {
        //alert("ERROR LINKING shaderProgram");
    }
    return shaderProgram;
}

function loadShader(gl, type, source)
{
    //returns id
    const shader = gl.createShader(type);
    //send source to shader object 
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    //check for compilation 
    if(!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
    {
        var compilationLog = gl.getShaderInfoLog(shader);
        console.log('Shader compiler log: ' + compilationLog);
      //  alert("LOADING FAILED");
    }
    return shader;
}

function loadTexture(gl, url) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
  
    // Because images have to be downloaded over the internet
    // they might take a moment until they are ready.
    // Until then put a single pixel in the texture so we can
    // use it immediately. When the image has finished downloading
    // we'll update the texture with the contents of the image.
    const level = 0;
    const internalFormat = gl.RGBA;
    const width = 10;
    const height = 10;
    const border = 0;
    const srcFormat = gl.RGBA;
    const srcType = gl.UNSIGNED_BYTE;
    gl.texImage2D(
      gl.TEXTURE_2D,
      level,
      internalFormat,
      width,
      height,
      border,
      srcFormat,
      srcType,
      null
    );
    gl.bindTexture(gl.TEXTURE_2D, texture);
   
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    return texture;
  }
  function isPowerOf2(value) {
    return (value & (value - 1)) === 0;
  }
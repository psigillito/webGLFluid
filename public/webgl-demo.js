import { initBuffers } from "./init-buffers.js";
import { drawScene } from "./draw-scene.js";
import { setPositionAttribute } from "./draw-scene.js";
import { setTextureAttribute } from "./draw-scene.js";
main();

let deltaTime = 0;
var mouseStartX = 0.0;
var mouseStartY = 0.0;
var sceneDT = 1.0 /60.0; 
//TODO Simplify
//upscale to 20x20 -- resolution v cell width 
//make sampling be four sides of cell 
//solve pressure 
//solve advect through itself 
// increase particles
// put particles in hash  

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
    //dragging mouse updating backgroun 
    const fsSource2 = 
    `#version 300 es
    in highp vec2 vTextureCoord;
    uniform sampler2D uSampler;
    uniform int res;
    uniform int xPosition;
    uniform int yPosition;
    out highp vec4 outColor;

    uniform highp float mouseX;
    uniform highp float mouseY; 
    uniform highp float mouseXVelocity;
    uniform highp float mouseYVelocity;

    void main(void) {

      highp float fxPosition = gl_FragCoord.x;
      highp float fyPosition = gl_FragCoord.y;

      int xIndex = int(fxPosition);
      int yIndex = int(fyPosition);

      //magic number, we know width is 10
      int targetPosition = xPosition / res;
      int targetPositionY = yPosition / res;


      bool x = xIndex == targetPosition; 
      bool y = yIndex == targetPositionY;
      bool bothSelected = (y && x);
      //bool notSelected = (!y || !x);
      highp float notSelectedF = float(!bothSelected);
      highp float convertedBoth = float(bothSelected);
      outColor = texture(uSampler, vTextureCoord);

      //if not selected do originalColor*1, if selected do 1* newvalues 
      outColor = (outColor * notSelectedF) + (vec4( mouseXVelocity, mouseYVelocity, outColor.z, 1.0) * convertedBoth);
      //outColor.x = outColor.x + (convertedBoth * mouseXVelocity * 0.0001);
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
    uniform sampler2D velocityField;
    

    void main() {
      //convert the quad coordinates with (-1,-1)  in lower left with range of -1 to 1 
      //to image (0,0) at lower left and range from 0 to 1.
      highp float xPosition = (aVertexPosition.x + 1.0) / 2.0;
      highp float yPosition = (aVertexPosition.y + 1.0) / 2.0;
      vec4 currentVelocity = texture( velocityField, vec2(xPosition, yPosition));

      gl_PointSize = 2.0;
      gl_Position = vec4(aVertexPosition, 1.0);
      gl_Position.x = gl_Position.x + currentVelocity.x;
      gl_Position.y = gl_Position.y + currentVelocity.y;
      outPosition = vec3(gl_Position);
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
    const res = 20;

    const cellWidth = canvas.width / res;


    
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

    //create 2 textures for velocity
    const texture = loadTexture(gl, res);
    const secondTexture = loadTexture(gl, res);


    //write red to texture 
    
    //gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    //var attachmentPoint = gl.COLOR_ATTACHMENT0;
    //gl.framebufferTexture2D( gl.FRAMEBUFFER, attachmentPoint, gl.TEXTURE_2D, texture, 0);
    


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
    gl.viewport(0,0, res,res);
    gl.useProgram(programInfo3.program)
    setPositionAttribute(gl, buffers, programInfo3);
    setTextureAttribute(gl, buffers, programInfo3);
    gl.drawArrays(gl.TRIANGLES, offset, vertexCount);

    gl.bindFramebuffer(gl.FRAMEBUFFER, fb2);
    gl.viewport(0,0, res,res);
    gl.useProgram(programInfo3.program)
    setPositionAttribute(gl, buffers, programInfo3);
    setTextureAttribute(gl, buffers, programInfo3);
    gl.drawArrays(gl.TRIANGLES, offset, vertexCount);

    //reset to canvas output 
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    //setup drawing particles
    let then = 0;
    const PARTICLE_COUNT = 1;
    var particlePositions = [ 0.0, 0.0, 0.0];
    gl.useProgram(programInfoParticle.program)
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(particlePositions),gl.STATIC_DRAW); 
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(0);

    //Do particle position image 
    var velocityUniformId = gl.getUniformLocation(programInfoParticle.program, "velocityField");
    gl.uniform1i(velocityUniformId, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);

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
      drawScene(gl, programInfo, buffers, texture);
       
      //draw particle, also setup transform to feedback 
      gl.useProgram(programInfoParticle.program)
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
      gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
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
        //console.log(x);

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

    function setObstacle(x,y,reset)
	  {
      //console.log(x - 7);
      var velocityX = 0.0;
      var velocityY = 0.0;
      if(!reset)
      {
        velocityX = (x - mouseStartX);
        velocityY = -(y - mouseStartY);
      }
      console.log(velocityX);

      mouseStartX = x;
      mouseStartY = y;
      var mouseRadius = 0.15;


      //update secondTexture with 1st Texture + position painted red 
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb2);
      gl.viewport(0,0, res,res);//
      gl.useProgram(programInfo2.program)
      setPositionAttribute(gl, buffers, programInfo2);
      setTextureAttribute(gl, buffers, programInfo2);
      var targetCopy = gl.getUniformLocation(programInfo2.program, "uSampler");
      gl.uniform1i(targetCopy, 0);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);

      //resolution
      var resTarget = gl.getUniformLocation(programInfo2.program, "res");
      gl.uniform1i(resTarget, cellWidth);

      //and event position 
      var mouseXTarget = gl.getUniformLocation(programInfo2.program, "mouseX");
      gl.uniform1f(mouseXTarget, x);
      var mouseYTarget = gl.getUniformLocation(programInfo2.program, "mouseY");
      gl.uniform1f(mouseYTarget, y);

      var mouseXVelocity = gl.getUniformLocation(programInfo2.program, "mouseXVelocity");
      gl.uniform1f(mouseXVelocity, velocityX);
      var mouseYVelocity = gl.getUniformLocation(programInfo2.program, "mouseYVelocity");
      gl.uniform1f(mouseYVelocity, velocityY);

      var targetLocation = gl.getUniformLocation(programInfo2.program, "xPosition");
      gl.uniform1i(targetLocation, x - 8);
      targetLocation = gl.getUniformLocation(programInfo2.program, "yPosition");
      gl.uniform1i(targetLocation, (canvas.height - (y - 8 )));
      gl.drawArrays(gl.TRIANGLES, offset, vertexCount);


      //copy scond texture to first texture  
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
      gl.viewport(0,0, res,res);
      gl.useProgram(programInfo.program)
      setPositionAttribute(gl, buffers, programInfo);
      setTextureAttribute(gl, buffers, programInfo);
      var targetCopy = gl.getUniformLocation(programInfo.program, "uSampler");
      gl.uniform1i(targetCopy, 0);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, secondTexture);
      gl.drawArrays(gl.TRIANGLES, offset, vertexCount);

      //go back to rendering normal 
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

      /********************** */
      //console.log(x - 7);
 


      //need to update velocity field based on drag
      //simple first, if in  area, make -0.1 
      //probably doesnt need to go to gpu, just updating one location 
      //HERE


      //iterate over every cell in 
      /*for(var i = 0; i < fluid.u.length; ++i)
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
        {
          fluid.u[i] = 0.001 * velocityX;
        } 
        {
          fluid.v[i] = - 0.001 * velocityY;
        }
      }

      //go back to rendering normal 
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);*/




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

function loadTexture(gl, res) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
  
    // Because images have to be downloaded over the internet
    // they might take a moment until they are ready.
    // Until then put a single pixel in the texture so we can
    // use it immediately. When the image has finished downloading
    // we'll update the texture with the contents of the image.
    const level = 0;
    const internalFormat = gl.RGBA;
    const width = res;
    const height = res;
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
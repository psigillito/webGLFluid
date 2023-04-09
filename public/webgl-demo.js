import { initBuffers } from "./init-buffers.js";
import { drawScene } from "./draw-scene.js";
import { setPositionAttribute } from "./draw-scene.js";
import { setTextureAttribute } from "./draw-scene.js";
main();

let deltaTime = 0;

function main()
{
    const vsSource = `
    attribute vec4 aVertexPosition;
    attribute vec2 aTextureCoord;
    varying highp vec2 vTextureCoord;
    void main() {
      gl_Position = vec4(aVertexPosition.x, aVertexPosition.y, 0.0, 1.0);
      vTextureCoord = aTextureCoord;
    }
    `;
 
    const fsSource = `
    varying highp vec2 vTextureCoord;
    uniform sampler2D uSampler;
    void main(void) {
      gl_FragColor = texture2D(uSampler, vTextureCoord);
    }
    `;

    const fsSource2 = `
    varying highp vec2 vTextureCoord;
    uniform sampler2D uSampler;
    uniform int xPosition;
    uniform int yPosition;
    void main(void) {

      highp float fxPosition = gl_FragCoord.x;
      highp float fyPosition = gl_FragCoord.y;

      int xIndex = int(fxPosition);
      int yIndex = int(fyPosition);

      //magic number, we know width is 100
      int targetPosition = xPosition / 10;
      int targetPositionY = yPosition / 10;

      bool x = xIndex == targetPosition; 
      bool y = yIndex == targetPositionY;
      bool bothSelected = (y && x);
      highp float convertedBoth = float(bothSelected);
      gl_FragColor = texture2D(uSampler, vTextureCoord);
      gl_FragColor.x = gl_FragColor.x + (convertedBoth * 0.1);
      //gl_FragColor = vec4((fxPosition/10.0) ,(convertedBoth * 0.5),0.0,1.0);
    }
    `;

    const vsSource2 = `
    attribute vec4 aVertexPosition;
    attribute vec2 aTextureCoord;
    varying highp vec2 vTextureCoord;
    void main() {
      gl_Position = vec4(aVertexPosition.x, aVertexPosition.y, 0.0, 1.0);
      vTextureCoord = aTextureCoord;
    }
    `;


    const fsSourceBlank = `
    varying highp vec2 vTextureCoord;
    uniform sampler2D uSampler;
    void main(void) {
      gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    }
    `;

    const vsParticle = 
    `
    attribute vec3 aVertexPosition;
    void main() {
      gl_PointSize = 2.0;
      gl_Position = vec4(aVertexPosition, 1.0);
    }
    `;

    const fsParticle = `
    void main(void) {
      gl_FragColor = vec4(0.0, 0.0, 1.0, 1.0);
    }
    `;



    //grab canvas and make webgl context
    const canvas = document.querySelector("#glcanvas");
    const gl = canvas.getContext("webgl2");
    const buffers = initBuffers(gl);
    const offset = 0;
    const vertexCount = 6;
    var mouseDown = false;

    
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

   const shaderProgramParticle = initShaderProgram(gl, vsParticle, fsParticle);
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


    //make sure both are all blank
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


    gl.bindFramebuffer(gl.FRAMEBUFFER, null);


   
    //null renders to canvas
    //gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    let then = 0;
    var particlePositions = [ 0.0, 0.0, 0.0];


    function render(now) {
      now *= 0.001; // convert to seconds
      deltaTime = now - then;
      then = now;
  
      //todo unblocking scene
      drawScene(gl, programInfo, buffers, texture);
      //draw particle 

      //gl.clearDepth (1.0);
      //gl.enable(gl.DEPTH_TEST);
      //gl.depthFunc(gl.LEQUAL);
  

      gl.useProgram(programInfoParticle.program)
      
      
      const positionBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      particlePositions[0] = particlePositions[0] + 0.01;
      gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(particlePositions),gl.STATIC_DRAW); 
      gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(0);

      gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
      gl.drawArrays(gl.POINTS, 0, 1);

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

    function setObstacle(x,y,reset)
	  {
      console.log(x - 7);
 
      //update secondTexture with 1st Texture + position painted red 
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb2);
      gl.viewport(0,0, 10,10);
      gl.useProgram(programInfo2.program)
      setPositionAttribute(gl, buffers, programInfo2);
      setTextureAttribute(gl, buffers, programInfo2);
      var targetCopy = gl.getUniformLocation(programInfo2.program, "uSampler");
      gl.uniform1i(targetCopy, 0);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);

      //and event position 

      var targetLocation = gl.getUniformLocation(programInfo2.program, "xPosition");
      gl.uniform1i(targetLocation, x - 8);
      targetLocation = gl.getUniformLocation(programInfo2.program, "yPosition");
      gl.uniform1i(targetLocation, (100 - (y - 8 )));
      gl.drawArrays(gl.TRIANGLES, offset, vertexCount);


      //copy scond texture to first texture  
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
      gl.viewport(0,0, 10,10);
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
        alert("LOADING FAILED");
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
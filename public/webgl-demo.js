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
    uniform mat4 uModelViewMatrix;
    uniform mat4 uProjectionMatrix;
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
      gl_FragColor = vec4((fxPosition/10.0) ,(convertedBoth * 0.5),0.0,1.0);
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







    //grab canvas and make webgl context
    const canvas = document.querySelector("#glcanvas");
    const gl = canvas.getContext("webgl2");

    const fb = gl.createFramebuffer(); 

    
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


   

    //do texture update here 
    //need shader program for filling 
    const buffers = initBuffers(gl);
    const texture = loadTexture(gl, "Untitled.png");


    //write red to texture 
    
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    //attach texture as color attachment 
    const attachmentPoint = gl.COLOR_ATTACHMENT0;
    gl.framebufferTexture2D( gl.FRAMEBUFFER, attachmentPoint, gl.TEXTURE_2D, texture, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);


   
    //null renders to canvas
    //gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    let then = 0;

    function render(now) {
      now *= 0.001; // convert to seconds
      deltaTime = now - then;
      then = now;
  
      drawScene(gl, programInfo, buffers, texture);
  
      requestAnimationFrame(render);
    }


    canvas.addEventListener('mouseup', event => {
      console.log(event.x -7);
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
      gl.useProgram(programInfo2.program)
      setPositionAttribute(gl, buffers, programInfo2);
      setTextureAttribute(gl, buffers, programInfo2);


      var targetLocation = gl.getUniformLocation(programInfo2.program, "xPosition");
      gl.uniform1i(targetLocation, event.x - 8);
      var targetLocation = gl.getUniformLocation(programInfo2.program, "yPosition");
      gl.uniform1i(targetLocation, (100 - (event.y - 8 )));


      // Bind the texture to texture unit 0
      //gl.bindTexture(gl.TEXTURE_2D, texture);
        // Tell the shader we bound the texture to texture unit 0
      //gl.uniform1i(programInfo.uniformLocations.uSampler, 0);
  
      const offset = 0;
      const vertexCount = 6;
      gl.drawArrays(gl.TRIANGLES, offset, vertexCount);

      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      //draw to buffer all red 
      //attach frame buffer 
      //update the texture to paint pixel black 
    });

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

        //alert("LOADING FAILED");
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
    const width = 1;
    const height = 1;
    const border = 0;
    const srcFormat = gl.RGBA;
    const srcType = gl.UNSIGNED_BYTE;
    const pixel = new Uint8Array([0, 0, 255, 255]); // opaque blue
    gl.texImage2D(
      gl.TEXTURE_2D,
      level,
      internalFormat,
      width,
      height,
      border,
      srcFormat,
      srcType,
      pixel
    );
  
    const image = new Image();
    image.onload = () => {
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(
        gl.TEXTURE_2D,
        level,
        internalFormat,
        srcFormat,
        srcType,
        image
      );
  
      // WebGL1 has different requirements for power of 2 images
      // vs. non power of 2 images so check if the image is a
      // power of 2 in both dimensions.
      //if (isPowerOf2(image.width) && isPowerOf2(image.height)) {
        // Yes, it's a power of 2. Generate mips.
        //gl.generateMipmap(gl.TEXTURE_2D);
      //} else {
        // No, it's not a power of 2. Turn off mips and set
        // wrapping to clamp to edge
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

      //}
    };
    image.src = url;
  
    return texture;
  }
  function isPowerOf2(value) {
    return (value & (value - 1)) === 0;
  }
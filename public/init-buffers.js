function initBuffers(gl) {
    const positionBuffer = initPositionBuffer(gl);
    const textureCoordBuffer = initTextureBuffer(gl);
    return {position: positionBuffer,
            textureCoord: textureCoordBuffer};
}

function initPositionBuffer(gl){
    //return position id
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    const positions = [-1.0,  1.0, //top left 
                       -1.0, -1.0, //low left 
                        1.0, -1.0, //lower right 
                       -1.0,  1.0, //top left
                        1.0, -1.0, //lower right 
                        1.0,  1.0 ]; // upper right 


    gl.bufferData(gl.ARRAY_BUFFER,
        new Float32Array(positions),
        gl.STATIC_DRAW);

    return positionBuffer;
}

function initTextureBuffer(gl){
    const textureCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, textureCoordBuffer);

    const textureCoordinates = [
        0.0, 1.0, //top left 
        0.0, 0.0, //lower left
        1,0, 0.0,  //lower right
        1.0, 1.0, //upper right 
        0.0, 1.0, //top left
        1.0, 0.0, //lowerright
        
    ];

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoordinates), gl.STATIC_DRAW);
    return textureCoordBuffer;
}
export { initBuffers };

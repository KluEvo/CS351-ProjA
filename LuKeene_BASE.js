//3456789_123456789_123456789_123456789_123456789_123456789_123456789_123456789_
// (JT: why the numbers? counts columns, helps me keep 80-char-wide listings)
//
// Chapter 5: ColoredTriangle.js (c) 2012 matsuda  AND
// Chapter 4: RotatingTriangle_withButtons.js (c) 2012 matsuda
// became:
//
// ColoredMultiObject.js  MODIFIED for EECS 351-1, 
//									Northwestern Univ. Jack Tumblin
//    --converted from 2D to 4D (x,y,z,w) vertices
//    --demonstrate how to keep & use MULTIPLE colored shapes in just one
//			Vertex Buffer Object(VBO). 
//    --demonstrate 'nodes' vs. 'vertices'; geometric corner locations where
//				OpenGL/WebGL requires multiple co-located vertices to implement the
//				meeting point of multiple diverse faces.
//    --Simplify fcn calls: make easy-access global vars for gl,g_nVerts, etc.
//
// Vertex shader program----------------------------------
var VSHADER_SOURCE =
  `uniform mat4 u_ModelMatrix;
  attribute vec4 a_Position;
  attribute vec4 a_Color;
  varying vec4 v_Color;
  
  void main() {
    gl_Position = u_ModelMatrix * a_Position;
    gl_PointSize = 10.0;
    v_Color = a_Color;
  }`;

// Fragment shader program----------------------------------
var FSHADER_SOURCE =
  `precision mediump float;
  varying vec4 v_Color;
  void main() {
    gl_FragColor = v_Color;
  }`;

// Easy-Access Global Variables-----------------------------
// (simplifies function calls. LATER: merge them into one 'myApp' object)
var ANGLE_STEP = 45.0;  // -- Rotation angle rate (degrees/second)
var gl;                 // WebGL's rendering context; value set in main()
var g_nVerts;           // # of vertices in VBO; value set in main()
var myCanvas = document.getElementById('HTML5_canvas');     

var start = Date.now();
var now = Date.now();
var totaltimeDelta = 0;
var g_last = now;
var running = true;

// Angle variables
var spineRotation = 0.0;
var leftHeadAngle = 0.0;
var rightHeadAngle = 0.0;
var witherRotation = 0.0;
var facing = 0.0;
var fishFlap = 0.0;
var fishSpinAngle = 0.0;
var wiggle = 0.0
var wanderX = 0.0;
var danceAngle = 0.0;
var dancing = false

// drag translation vars
var eyetrackDX = 0.0;
var eyetrackDY = 0.0;  
var headtrackDX = 0.0; 
var headtrackDY = 0.0;

// User input
var g_isDrag=false;		// mouse-drag: true when user holds down mouse button
var g_xMclik=0.0;			// last mouse button-down position (in CVV coords)
var g_yMclik=0.0;   
var g_xMdragTot=0.0;	// total (accumulated) mouse-drag amounts (in CVV coords).
var g_yMdragTot=0.0; 
var g_digits=5;			// DIAGNOSTICS: # of digits to print in console.log (
//  console.log('xVal:', xVal.toFixed(g_digits)); // print 5 digits
var eyeball = 1;
var controllingString = 'eyeball';
var danceDuration = 800

function main() {

  //==============================================================================
  // Retrieve <canvas> element we created in HTML file:
  var myCanvas = document.getElementById('HTML5_canvas');

  // Get rendering context from our HTML-5 canvas needed for WebGL use.
  // Success? if so, all WebGL functions are now members of the 'gl' object.
  // For example, gl.clearColor() calls the WebGL function 'clearColor()'.
  gl = getWebGLContext(myCanvas);
  if (!gl) {
    console.log('Failed to get the WebGL rendering context from myCanvas');
    return;
  }

  // THE 'REVERSED DEPTH' PROBLEM:=======================================
  // IF we don't transform our vertices by a 3D Camera Projection Matrix
  // (and we don't -- not until Project B) then the GPU will compute reversed 
  // depth values: depth==0 for vertex z == -1; depth==1 for vertex z== +1. 
  // Enabling the GPU's 'depth buffer' then causes strange-looking pictures!
  // To correct the 'REVERSED DEPTH' problem, we will
  // reverse the depth-buffer's *usage* of its computed depth values, like this:
  gl.enable(gl.DEPTH_TEST); // enabled by default, but let's be SURE.
  gl.clearDepth(0.0); // each time we 'clear' our depth buffer, set all
  // pixel depths to 0.0 (1.0 is DEFAULT)
  gl.depthFunc(gl.GREATER); // (gl.LESS is DEFAULT; reverse it!)
  // draw a pixel only if its depth value is GREATER
  // than the depth buffer's stored value.
  //=====================================================================

  // Specify the color for clearing <canvas>
  gl.clearColor(0.0, 0.0, 0.0, 1.0);

  // Initialize shaders
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to intialize shaders.');
    return;
  }

  // Create a Vertex Buffer Object (VBO) in the GPU, and then fill it with
  // g_nVerts vertices.  (builds a float32array in JS, copies contents to GPU)
  g_nVerts = initVertexBuffer();
  if (g_nVerts < 0) {
    console.log('Failed to set the vertex information');
    return;
  }

  // NEW!! Enable 3D depth-test when drawing: don't over-draw at any pixel 
  // unless the new Z value is closer to the eye than the old one..
  //	gl.depthFunc(gl.LESS);
  gl.enable(gl.DEPTH_TEST);


  // Get handle to graphics system's storage location of u_ModelMatrix
  var u_ModelLoc = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  if (!u_ModelLoc) {
    console.log('Failed to get the storage location of u_ModelMatrix');
    return;
  }
  // Create a local version of our model matrix in JavaScript 
  var modelMatrix = new Matrix4();
  // Constructor for 4x4 matrix, defined in the 'cuon-matrix-quat03.js' library
  // supplied by your textbook.  (Chapter 3)

  // Initialize the matrix: 
  modelMatrix.setIdentity(); // (not req'd: constructor makes identity matrix)

  // Transfer modelMatrix values to the u_ModelMatrix variable in the GPU
  gl.uniformMatrix4fv(u_ModelLoc, false, modelMatrix.elements);

  //-----------------  DRAW STUFF!
  //---------------Beginner's method: DRAW ONCE and END the program.
  // (makes a static, non-responsive image)
  gl.drawArrays(gl.TRIANGLES,   // drawing primitive. (try gl.LINE_LOOP too!)
    0,
    12);
  // says to WebGL: draw these vertices held in the currently-bound VBO.

  //---------------Interactive Animation: draw repeatedly
  // Create an endlessly repeated 'tick()' function by this clever method:
  // a)  Declare the 'tick' variable whose value is this function:

	window.addEventListener("keydown", myKeyDown, false);
	window.addEventListener("mousedown", myMouseDown); 
  window.addEventListener("mousemove", myMouseMove); 
	window.addEventListener("mouseup", myMouseUp);	
	window.addEventListener("click", myMouseClick);				
	window.addEventListener("dblclick", myMouseDblClick); 
  
// Also display our current mouse-dragging state:


  var tick = function () {
    g_last = now;
    now = Date.now();

    updateSliderAndDisplay();
    updateCheckboxState();

    if (running){
      totaltimeDelta += now - g_last
      spineRotation = angleCalc(spineRotation, 1, now, g_last, ANGLE_STEP);
      leftHeadAngle = (angleCalc(leftHeadAngle, 3, now, g_last, ANGLE_STEP) + 360) % 360;
      rightHeadAngle = angleCalc(rightHeadAngle, -3, now, g_last, ANGLE_STEP) % 360;
      fishFlap = angleCalcTrig(8, 10, totaltimeDelta, 0, 45);
      wanderX = angleCalcTrig(3, 0.5, totaltimeDelta, 0, 45) - 1/3;
      wiggle = angleCalcTrig(14, 5, totaltimeDelta, 0, 45);
      witherRotation = angleCalcTrig(3, 90, totaltimeDelta, -900, 45);
    }

    if (blinking != -1) {
      eyeblink = angleCalcTrig(20, 0.5, now, blinking, 50) + 0.5;
      if (eyeblink >= 0.99){
        blinking = -1;
      } 
    }

    if (spinny != -1) {
      fishSpinAngle = angleCalc(fishSpinAngle, 5, now, g_last, 40)
      // console.log('fishSpinAngle=', fishSpinAngle);
      if ((fishSpinAngle >= 359) || (fishSpinAngle < 0)){
        spinny = -1;
        fishSpinAngle = 0;
      } 
    }
    
    if (danceStopTime >= now || Math.abs(danceAngle) > 5) {
      dancing = true

      danceAngle = angleCalcTrig(25, 15, now, danceStopTime - danceDuration, 55, 90);
    }
    else if (dancing == true){
      danceAngle = 0
    }

    if (eyeball) {
      controllingString = 'guardian eyeball';
    }else {

      controllingString = 'wither head';
    }
    document.getElementById('CurEyeballDisplay').innerHTML= 'Mouse drag currently controls: ' + controllingString;


    draw(modelMatrix, u_ModelLoc);   // Draw shapes
    // console.log('witherRotation=', witherRotation);
    // console.log('fishFlap=', fishFlap);
    requestAnimationFrame(tick, myCanvas);
    // Request that the browser re-draw the webpage
  };
  // AFTER that, call the function.
  tick();							// start (and continue) animation: 
  // HOW?  Execution jumps to the 'tick()' function; it
  // completes each statement inside the curly-braces {}
  // and then goes on to the next statement.  That next
  // statement calls 'tick()'--thus an infinite loop!

}

function initVertexBuffer() {
  //==============================================================================
  var c30 = Math.sqrt(0.75);					// == cos(30deg) == sqrt(3) / 2
  var sq2 = Math.sqrt(2.0);

  var colorShapes = new Float32Array([
    // Vertex coordinates(x,y,z,w) and color (R,G,B) for a color tetrahedron:
    //		Apex on +z axis; equilateral triangle base at z=0
    /*	Nodes:  (a 'node' is a 3D location where we specify 1 or more vertices)
         0.0,	 0.0, sq2, 1.0,			1.0, 	1.0,	1.0,	// Node 0 (apex, +z axis;  white)
         c30, -0.5, 0.0, 1.0, 		0.0,  0.0,  1.0, 	// Node 1 (base: lower rt; red)
         0.0,  1.0, 0.0, 1.0,  		1.0,  0.0,  0.0,	// Node 2 (base: +y axis;  grn)
        -c30, -0.5, 0.0, 1.0, 		0.0,  1.0,  0.0, 	// Node 3 (base:lower lft; blue)
    
      Build tetrahedron from individual triangles (gl.TRIANGLES); each triangle
      requires us to specify 3 vertices in CCW order.  
    */
    // Face 0: (left side)
    0.0, 0.0, sq2, 1.0, 1.0, 1.0, 1.0,	// Node 0
    c30, -0.5, 0.0, 1.0, 0.0, 0.0, 1.0, 	// Node 1
    0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 0.0,	// Node 2
    // Face 1: (right side)
    0.0, 0.0, sq2, 1.0, 1.0, 1.0, 1.0,	// Node 0
    0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 0.0,	// Node 2
    -c30, -0.5, 0.0, 1.0, 0.0, 1.0, 0.0, 	// Node 3
    // Face 2: (lower side)
    0.0, 0.0, sq2, 1.0, 1.0, 1.0, 1.0,	// Node 0 
    -c30, -0.5, 0.0, 1.0, 0.0, 1.0, 0.0, 	// Node 3
    c30, -0.5, 0.0, 1.0, 0.0, 0.0, 1.0, 	// Node 1 
    // Face 3: (base side)  
    -c30, -0.5, -0.0, 1.0, 0.0, 1.0, 0.0, 	// Node 3
    0.0, 1.0, -0.0, 1.0, 1.0, 0.0, 0.0,	// Node 2
    c30, -0.5, -0.0, 1.0, 0.0, 0.0, 1.0, 	// Node 1

    /*    // Cube Nodes  ('node': a 3D location where we specify 1 or more vertices)
        -1.0, -1.0, -1.0, 1.0	// Node 0
        -1.0,  1.0, -1.0, 1.0	// Node 1
         1.0,  1.0, -1.0, 1.0	// Node 2
         1.0, -1.0, -1.0, 1.0	// Node 3
        
         1.0,  1.0,  1.0, 1.0	// Node 4
        -1.0,  1.0,  1.0, 1.0	// Node 5
        -1.0, -1.0,  1.0, 1.0	// Node 6
         1.0, -1.0,  1.0, 1.0	// Node 7
    */
    // +x face
    1.0, -1.0, -1.0, 1.0, 1.0, 0.0, 0.0,	// Node 3
    1.0, 1.0, -1.0, 1.0, 0.0, 1.0, 0.0,	// Node 2
    1.0, 1.0, 1.0, 1.0, 1.0, 0.5, 0.0,  // Node 4

    1.0, 1.0, 1.0, 1.0, 1.0, 0.5, 0.0,	// Node 4
    1.0, -1.0, 1.0, 1.0, 1.0, 0.0, 1.0,	// Node 7
    1.0, -1.0, -1.0, 1.0, 1.0, 0.0, 0.0,	// Node 3

    // +y face
    -1.0, 1.0, -1.0, 1.0, 0.0, 0.0, 1.0,	// Node 1
    -1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.0,	// Node 5
    1.0, 1.0, 1.0, 1.0, 1.0, 0.5, 0.0,	// Node 4

    1.0, 1.0, 1.0, 1.0, 1.0, 0.5, 0.0,	// Node 4
    1.0, 1.0, -1.0, 1.0, 0.0, 1.0, 0.0,	// Node 2 
    -1.0, 1.0, -1.0, 1.0, 0.0, 0.0, 1.0,	// Node 1

    // +z face
    -1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.0,	// Node 5
    -1.0, -1.0, 1.0, 1.0, 0.0, 1.0, 1.0,	// Node 6
    1.0, -1.0, 1.0, 1.0, 1.0, 0.0, 1.0,	// Node 7

    1.0, -1.0, 1.0, 1.0, 1.0, 0.0, 1.0,	// Node 7
    1.0, 1.0, 1.0, 1.0, 1.0, 0.5, 0.0,	// Node 4
    -1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.0,	// Node 5

    // -x face
    -1.0, -1.0, 1.0, 1.0, 0.0, 1.0, 1.0,	// Node 6	
    -1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.0,	// Node 5 
    -1.0, 1.0, -1.0, 1.0, 0.0, 0.0, 1.0,	// Node 1

    -1.0, 1.0, -1.0, 1.0, 0.0, 0.0, 1.0,	// Node 1
    -1.0, -1.0, -1.0, 1.0, 0.5, 0.0, 0.0,	// Node 0  
    -1.0, -1.0, 1.0, 1.0, 0.0, 1.0, 1.0,	// Node 6  

    // -y face
    1.0, -1.0, -1.0, 1.0, 1.0, 0.0, 1.0,	// Node 3
    1.0, -1.0, 1.0, 1.0, 1.0, 0.0, 1.0,	// Node 7
    -1.0, -1.0, 1.0, 1.0, 0.0, 1.0, 1.0,	// Node 6

    -1.0, -1.0, 1.0, 1.0, 0.0, 1.0, 1.0,	// Node 6
    -1.0, -1.0, -1.0, 1.0, 0.5, 0.0, 0.0,	// Node 0
    1.0, -1.0, -1.0, 1.0, 1.0, 0.1, 1.0,	// Node 3

    // -z face
    1.0, 1.0, -1.0, 1.0, 0.0, 1.0, 0.0,	// Node 2
    1.0, -1.0, -1.0, 1.0, 1.0, 1.0, 0.0,	// Node 3
    -1.0, -1.0, -1.0, 1.0, 0.5, 0.0, 0.0,	// Node 0		

    -1.0, -1.0, -1.0, 1.0, 0.5, 0.0, 0.0,	// Node 0
    -1.0, 1.0, -1.0, 1.0, 0.0, 0.0, 1.0,	// Node 1
    1.0, 1.0, -1.0, 1.0, 0.0, 1.0, 0.0,	// Node 2


    // hexagonal prism as a "cylinder" approximation
    -0.9106666666666667, 0.0, 1.0, 1.0, 1.0, 1.0, 0.0,
    -0.9106666666666667, 0.0, -0.33333333333333337, 1.0, 1.0, 0.0, 1.0,
    -0.9106666666666667, -0.6666666666666667, -0.33333333333333337, 1.0, 0.0, 0.0, 1.0,
    -0.9106666666666667, 0.0, 1.0, 1.0, 1.0, 1.0, 0.0,
    -0.9106666666666667, -0.6666666666666667, -0.33333333333333337, 1.0, 0.0, 0.0, 1.0,
    -0.9106666666666667, -0.6666666666666667, 1.0, 1.0, 0.0, 1.0, 0.0,

    -0.9106666666666667, 0.0, -0.33333333333333337, 1.0, 1.0, 0.0, 1.0,
    -0.33333333333333337, 0.33333333333333326, -0.33333333333333337, 1.0, 0.5, 0.25, 0.0,
    0.244, 0.0, -0.33333333333333337, 1.0, 0.5, 0.0, 0.0,
    -0.9106666666666667, 0.0, -0.33333333333333337, 1.0, 1.0, 0.0, 1.0,
    0.244, 0.0, -0.33333333333333337, 1.0, 0.5, 0.0, 0.0,
    0.244, -0.6666666666666667, -0.33333333333333337, 1.0, 0.0, 0.5, 0.0,
    -0.33333333333333337, -1.0, -0.33333333333333337, 1.0, 0.0, 0.75, 1.0,
    -0.9106666666666667, -0.6666666666666667, -0.33333333333333337, 1.0, 0.0, 0.0, 1.0,
    0.244, -0.6666666666666667, -0.33333333333333337, 1.0, 0.0, 0.5, 0.0,
    -0.9106666666666667, 0.0, -0.33333333333333337, 1.0, 1.0, 0.0, 1.0,
    0.244, -0.6666666666666667, -0.33333333333333337, 1.0, 0.0, 0.5, 0.0,
    -0.9106666666666667, -0.6666666666666667, -0.33333333333333337, 1.0, 0.0, 0.0, 1.0,


    -0.33333333333333337, -1.0, 1.0, 1.0, 0.0, 1.0, 1.0,
    -0.33333333333333337, -1.0, -0.33333333333333337, 1.0, 0.0, 0.75, 1.0,
    0.244, -0.6666666666666667, -0.33333333333333337, 1.0, 0.0, 0.5, 0.0,
    -0.33333333333333337, -1.0, 1.0, 1.0, 0.0, 1.0, 1.0,
    0.244, -0.6666666666666667, -0.33333333333333337, 1.0, 0.0, 0.5, 0.0,
    0.244, -0.6666666666666667, 1.0, 1.0, 0, 0, 1,

    0.244, 0.0, -0.33333333333333337, 1.0, 0.5, 0.0, 0.0,
    0.244, 0.0, 1.0, 1.0, 1, 0, 0,
    0.244, -0.6666666666666667, 1.0, 1.0, 0, 0, 1,
    0.244, 0.0, -0.33333333333333337, 1.0, 0.5, 0.0, 0.0,
    0.244, -0.6666666666666667, 1.0, 1.0, 0, 0, 1,
    0.244, -0.6666666666666667, -0.33333333333333337, 1.0, 0.0, 0.5, 0.0,

    -0.33333333333333337, -1.0, 1.0, 1.0, 0.0, 1.0, 1.0,
    -0.9106666666666667, -0.6666666666666667, 1.0, 1.0, 0.0, 1.0, 0.0,
    -0.9106666666666667, -0.6666666666666667, -0.33333333333333337, 1.0, 0.0, 0.0, 1.0,
    -0.33333333333333337, -1.0, 1.0, 1.0, 0.0, 1.0, 1.0,
    -0.9106666666666667, -0.6666666666666667, -0.33333333333333337, 1.0, 0.0, 0.0, 1.0,
    -0.33333333333333337, -1.0, -0.33333333333333337, 1.0, 0.0, 0.75, 1.0,

    0.244, 0.0, 1.0, 1.0, 1, 0, 0,
    -0.33333333333333337, 0.33333333333333326, 1.0, 1.0, 1.0, 0.5, 0.0,
    -0.9106666666666667, 0.0, 1.0, 1.0, 1.0, 1, 0,
    0.244, 0.0, 1.0, 1.0, 1, 0, 0,
    -0.9106666666666667, 0.0, 1.0, 1.0, 1.0, 1, 0,
    -0.9106666666666667, -0.6666666666666667, 1.0, 1.0, 0.0, 1.0, 0.0,
    -0.33333333333333337, -1.0, 1.0, 1.0, 0.0, 1.0, 1.0,
    0.244, -0.6666666666666667, 1.0, 1.0, 0, 0, 1,
    -0.9106666666666667, -0.6666666666666667, 1.0, 1.0, 0.0, 1.0, 0.0,
    0.244, 0.0, 1.0, 1.0, 1, 0, 0,
    -0.9106666666666667, -0.6666666666666667, 1.0, 1.0, 0.0, 1.0, 0.0,
    0.244, -0.6666666666666667, 1.0, 1.0, 0, 0, 1,


    0.244, 0.0, -0.33333333333333337, 1.0, 0.5, 0.0, 0.0,
    -0.33333333333333337, 0.33333333333333326, -0.33333333333333337, 1.0, 0.5, 0.25, 0.0,
    -0.33333333333333337, 0.33333333333333326, 1.0, 1.0, 1.0, 0.5, 0.0,
    0.244, 0.0, -0.33333333333333337, 1.0, 0.5, 0.0, 0.0,
    -0.33333333333333337, 0.33333333333333326, 1.0, 1.0, 1.0, 0.5, 0.0,
    0.244, 0.0, 1.0, 1.0, 1, 0, 0,

    -0.33333333333333337, 0.33333333333333326, -0.33333333333333337, 1.0, 0.5, 0.25, 0.0,
    -0.9106666666666667, 0.0, -0.33333333333333337, 1.0, 1.0, 0.0, 1.0,
    -0.9106666666666667, 0.0, 1.0, 1.0, 1.0, 1.0, 0.0,
    -0.33333333333333337, 0.33333333333333326, -0.33333333333333337, 1.0, 0.5, 0.25, 0.0,
    -0.9106666666666667, 0.0, 1.0, 1.0, 1.0, 1.0, 0.0,
    -0.33333333333333337, 0.33333333333333326, 1.0, 1.0, 1.0, 0.5, 0.0,

    
    // extruded cube
    0.35483870967741926,0.16161290322580646,0.871225806451613,1.0,	1.0, 1.0, 1.0,
    0.35483870967741926,-0.8712903225806452,0.871225806451613,1.0,	1.0, 1.0, 0.5,
    0.35483870967741926,-0.8712903225806452,-0.16161290322580635,1.0,	1.0, 1.0, 0.0,
    0.35483870967741926,0.16161290322580646,0.871225806451613,1.0,	1.0, 1.0, 1.0,
    0.35483870967741926,-0.8712903225806452,-0.16161290322580635,1.0,	1.0, 1.0, 0.0,
    0.35483870967741926,0.16161290322580646,-0.16161290322580635,1.0,	1.0, 0.5, 1.0,

    -0.935483870967742,-0.8712903225806452,0.871225806451613,1.0,	1.0, 0.5, 0.5,
    -0.935483870967742,0.16161290322580646,0.871225806451613,1.0,	1.0, 0.5, 0.5,
    -0.935483870967742,0.16161290322580646,-0.16161290322580635,1.0,	1.0, 0.0, 1.0,
    -0.935483870967742,-0.8712903225806452,0.871225806451613,1.0,	1.0, 0.5, 0.5,
    -0.935483870967742,0.16161290322580646,-0.16161290322580635,1.0,	1.0, 0.0, 1.0,
    -0.935483870967742,-0.8712903225806452,-0.16161290322580635,1.0,	1.0, 0.0, 0.5,

    0.21154838709677426,0.16161290322580646,1.0,1.0,	1.0, 0.0, 0.0,
    -0.8212903225806452,0.16161290322580646,1.0,1.0,	0.5, 1.0, 1.0,
    0.21154838709677426,-0.8712903225806452,1.0,1.0,	0.5, 1.0, 0.5,
    -0.8212903225806452,-0.8712903225806452,1.0,1.0,	0.5, 1.0, 0.0,
    0.21154838709677426,-0.8712903225806452,1.0,1.0,	0.5, 1.0, 0.5,
    -0.8212903225806452,0.16161290322580646,1.0,1.0,	0.5, 1.0, 1.0,

    -0.8212903225806452,0.16161290322580646,1.0,1.0,	0.5, 1.0, 1.0,
    -0.8212903225806452,0.16161290322580646,0.871225806451613,1.0,	0.5, 0.5, 1.0,
    -0.8212903225806452,-0.8712903225806452,0.871225806451613,1.0,	0.5, 0.5, 0.5,
    -0.8212903225806452,0.16161290322580646,1.0,1.0,	0.5, 1.0, 1.0,
    -0.8212903225806452,-0.8712903225806452,0.871225806451613,1.0,	0.5, 0.5, 0.5,
    -0.8212903225806452,-0.8712903225806452,1.0,1.0,	0.5, 1.0, 0.0,

    -0.8212903225806452,0.16161290322580646,0.871225806451613,1.0,	0.5, 0.5, 1.0,
    0.21154838709677426,0.16161290322580646,0.871225806451613,1.0,	0.5, 0.5, 0.0,
    -0.8212903225806452,0.29032258064516125,0.871225806451613,1.0,	0.5, 0.0, 1.0,
    -0.8212903225806452,0.16161290322580646,1.0,1.0,	0.5, 1.0, 1.0,
    0.21154838709677426,0.16161290322580646,0.871225806451613,1.0,	0.5, 0.5, 0.0,
    -0.8212903225806452,0.16161290322580646,0.871225806451613,1.0,	0.5, 0.5, 1.0,

    0.21154838709677426,0.16161290322580646,-0.29032258064516125,1.0,	0.5, 0.0, 0.5,
    0.21154838709677426,0.16161290322580646,-0.16161290322580635,1.0,	0.5, 0.0, 0.0,
    0.21154838709677426,-0.8712903225806452,-0.16161290322580635,1.0,	0.0, 0.5, 1.0,
    0.21154838709677426,0.16161290322580646,-0.29032258064516125,1.0,	0.5, 0.0, 0.5,
    0.21154838709677426,-0.8712903225806452,-0.16161290322580635,1.0,	0.0, 0.5, 1.0,
    0.21154838709677426,-0.8712903225806452,-0.29032258064516125,1.0,	0.0, 0.5, 0.5,

    0.35483870967741926,0.16161290322580646,0.871225806451613,1.0,	1.0, 1.0, 1.0,
    0.21154838709677426,-0.8712903225806452,0.871225806451613,1.0,	0.0, 0.5, 0.0,
    0.35483870967741926,-0.8712903225806452,0.871225806451613,1.0,	1.0, 1.0, 0.5,
    0.21154838709677426,-0.8712903225806452,0.871225806451613,1.0,	0.0, 0.5, 0.0,
    0.21154838709677426,0.16161290322580646,0.871225806451613,1.0,	0.5, 0.5, 0.0,
    0.21154838709677426,0.16161290322580646,1.0,1.0,	1.0, 0.0, 0.0,

    0.21154838709677426,-0.8712903225806452,0.871225806451613,1.0,	0.0, 0.5, 0.0,
    0.21154838709677426,0.16161290322580646,1.0,1.0,	1.0, 0.0, 0.0,
    0.21154838709677426,-0.8712903225806452,1.0,1.0,	0.5, 1.0, 0.5,
    0.21154838709677426,0.29032258064516125,0.871225806451613,1.0,	0.0, 0.0, 1.0,
    0.21154838709677426,0.16161290322580646,0.871225806451613,1.0,	0.5, 0.5, 0.0,
    0.21154838709677426,0.16161290322580646,-0.16161290322580635,1.0,	0.5, 0.0, 0.0,

    0.21154838709677426,0.29032258064516125,0.871225806451613,1.0,	0.0, 0.0, 1.0,
    0.21154838709677426,0.16161290322580646,-0.16161290322580635,1.0,	0.5, 0.0, 0.0,
    0.21154838709677426,0.29032258064516125,-0.16161290322580635,1.0,	0.0, 0.0, 0.5,
    0.21154838709677426,0.16161290322580646,0.871225806451613,1.0,	0.5, 0.5, 0.0,
    0.21154838709677426,-0.8712903225806452,0.871225806451613,1.0,	0.0, 0.5, 0.0,
    0.35483870967741926,0.16161290322580646,0.871225806451613,1.0,	1.0, 1.0, 1.0,

    0.21154838709677426,0.16161290322580646,-0.16161290322580635,1.0,	0.5, 0.0, 0.0,
    0.21154838709677426,0.16161290322580646,0.871225806451613,1.0,	0.5, 0.5, 0.0,
    0.35483870967741926,0.16161290322580646,0.871225806451613,1.0,	1.0, 1.0, 1.0,
    0.21154838709677426,-1.0,-0.16161290322580635,1.0,	0.0, 0.0, 0.0,
    0.21154838709677426,-0.8712903225806452,-0.16161290322580635,1.0,	0.0, 0.5, 1.0,
    0.21154838709677426,-0.8712903225806452,0.871225806451613,1.0,	0.0, 0.5, 0.0,

    0.21154838709677426,-1.0,-0.16161290322580635,1.0,	0.0, 0.0, 0.0,
    0.21154838709677426,-0.8712903225806452,0.871225806451613,1.0,	0.0, 0.5, 0.0,
    0.21154838709677426,-1.0,0.871225806451613,1.0,	0.75, 0.0, 0.25,
    0.21154838709677426,-0.8712903225806452,-0.16161290322580635,1.0,	0.0, 0.5, 1.0,
    0.21154838709677426,-1.0,-0.16161290322580635,1.0,	0.0, 0.0, 0.0,
    -0.8212903225806452,-0.8712903225806452,-0.16161290322580635,1.0,	0.75, 0.25, 0.0,

    -0.8212903225806452,-1.0,-0.16161290322580635,1.0,	0.25, 0.0, 0.75,
    -0.8212903225806452,-0.8712903225806452,-0.16161290322580635,1.0,	0.75, 0.25, 0.0,
    0.21154838709677426,-1.0,-0.16161290322580635,1.0,	0.0, 0.0, 0.0,
    0.35483870967741926,0.16161290322580646,-0.16161290322580635,1.0,	1.0, 0.5, 1.0,
    0.21154838709677426,0.16161290322580646,-0.16161290322580635,1.0,	0.5, 0.0, 0.0,
    0.35483870967741926,0.16161290322580646,0.871225806451613,1.0,	1.0, 1.0, 1.0,

    -0.8212903225806452,-1.0,0.871225806451613,1.0,	0.0, 0.75, 0.25,
    0.21154838709677426,-1.0,0.871225806451613,1.0,	0.75, 0.0, 0.25,
    -0.8212903225806452,-0.8712903225806452,0.871225806451613,1.0,	0.5, 0.5, 0.5,
    0.21154838709677426,-0.8712903225806452,0.871225806451613,1.0,	0.0, 0.5, 0.0,
    -0.8212903225806452,-0.8712903225806452,0.871225806451613,1.0,	0.5, 0.5, 0.5,
    0.21154838709677426,-1.0,0.871225806451613,1.0,	0.75, 0.0, 0.25,

    0.35483870967741926,-0.8712903225806452,0.871225806451613,1.0,	1.0, 1.0, 0.5,
    0.21154838709677426,-0.8712903225806452,0.871225806451613,1.0,	0.0, 0.5, 0.0,
    0.21154838709677426,-0.8712903225806452,-0.16161290322580635,1.0,	0.0, 0.5, 1.0,
    0.35483870967741926,-0.8712903225806452,0.871225806451613,1.0,	1.0, 1.0, 0.5,
    0.21154838709677426,-0.8712903225806452,-0.16161290322580635,1.0,	0.0, 0.5, 1.0,
    0.35483870967741926,-0.8712903225806452,-0.16161290322580635,1.0,	1.0, 1.0, 0.0,

    0.21154838709677426,-0.8712903225806452,-0.29032258064516125,1.0,	0.0, 0.5, 0.5,
    0.21154838709677426,-0.8712903225806452,-0.16161290322580635,1.0,	0.0, 0.5, 1.0,
    -0.8212903225806452,-0.8712903225806452,-0.16161290322580635,1.0,	0.75, 0.25, 0.0,
    0.21154838709677426,-0.8712903225806452,-0.29032258064516125,1.0,	0.0, 0.5, 0.5,
    -0.8212903225806452,-0.8712903225806452,-0.16161290322580635,1.0,	0.75, 0.25, 0.0,
    -0.8212903225806452,-0.8712903225806452,-0.29032258064516125,1.0,	0.0, 0.25, 0.75,

    0.35483870967741926,-0.8712903225806452,-0.16161290322580635,1.0,	1.0, 1.0, 0.0,
    0.21154838709677426,-0.8712903225806452,-0.16161290322580635,1.0,	0.0, 0.5, 1.0,
    0.21154838709677426,0.16161290322580646,-0.16161290322580635,1.0,	0.5, 0.0, 0.0,
    0.35483870967741926,-0.8712903225806452,-0.16161290322580635,1.0,	1.0, 1.0, 0.0,
    0.21154838709677426,0.16161290322580646,-0.16161290322580635,1.0,	0.5, 0.0, 0.0,
    0.35483870967741926,0.16161290322580646,-0.16161290322580635,1.0,	1.0, 0.5, 1.0,

    0.21154838709677426,-0.8712903225806452,0.871225806451613,1.0,	0.0, 0.5, 0.0,
    0.21154838709677426,-0.8712903225806452,1.0,1.0,	0.5, 1.0, 0.5,
    -0.8212903225806452,-0.8712903225806452,0.871225806451613,1.0,	0.5, 0.5, 0.5,
    -0.8212903225806452,-0.8712903225806452,1.0,1.0,	0.5, 1.0, 0.0,
    -0.8212903225806452,-0.8712903225806452,0.871225806451613,1.0,	0.5, 0.5, 0.5,
    0.21154838709677426,-0.8712903225806452,1.0,1.0,	0.5, 1.0, 0.5,

    -0.935483870967742,-0.8712903225806452,-0.16161290322580635,1.0,	1.0, 0.0, 0.5,
    -0.8212903225806452,-0.8712903225806452,-0.16161290322580635,1.0,	0.75, 0.25, 0.0,
    -0.8212903225806452,-0.8712903225806452,0.871225806451613,1.0,	0.5, 0.5, 0.5,
    -0.935483870967742,-0.8712903225806452,-0.16161290322580635,1.0,	1.0, 0.0, 0.5,
    -0.8212903225806452,-0.8712903225806452,0.871225806451613,1.0,	0.5, 0.5, 0.5,
    -0.935483870967742,-0.8712903225806452,0.871225806451613,1.0,	1.0, 0.5, 0.5,

    -0.8212903225806452,0.16161290322580646,-0.16161290322580635,1.0,	1.0, 0.25, 0.25,
    -0.8212903225806452,-0.8712903225806452,-0.16161290322580635,1.0,	0.75, 0.25, 0.0,
    -0.935483870967742,-0.8712903225806452,-0.16161290322580635,1.0,	1.0, 0.0, 0.5,
    -0.8212903225806452,0.16161290322580646,-0.16161290322580635,1.0,	1.0, 0.25, 0.25,
    -0.935483870967742,-0.8712903225806452,-0.16161290322580635,1.0,	1.0, 0.0, 0.5,
    -0.935483870967742,0.16161290322580646,-0.16161290322580635,1.0,	1.0, 0.0, 1.0,

    -0.8212903225806452,0.29032258064516125,-0.16161290322580635,1.0,	0.25, 0.25, 1.0,
    0.21154838709677426,0.29032258064516125,-0.16161290322580635,1.0,	0.0, 0.0, 0.5,
    -0.8212903225806452,0.16161290322580646,-0.16161290322580635,1.0,	1.0, 0.25, 0.25,
    0.21154838709677426,0.16161290322580646,-0.16161290322580635,1.0,	0.5, 0.0, 0.0,
    -0.8212903225806452,0.16161290322580646,-0.16161290322580635,1.0,	1.0, 0.25, 0.25,
    0.21154838709677426,0.29032258064516125,-0.16161290322580635,1.0,	0.0, 0.0, 0.5,

    -0.935483870967742,-0.8712903225806452,0.871225806451613,1.0,	1.0, 0.5, 0.5,
    -0.8212903225806452,-0.8712903225806452,0.871225806451613,1.0,	0.5, 0.5, 0.5,
    -0.8212903225806452,0.16161290322580646,0.871225806451613,1.0,	0.5, 0.5, 1.0,
    -0.935483870967742,-0.8712903225806452,0.871225806451613,1.0,	1.0, 0.5, 0.5,
    -0.8212903225806452,0.16161290322580646,0.871225806451613,1.0,	0.5, 0.5, 1.0,
    -0.935483870967742,0.16161290322580646,0.871225806451613,1.0,	1.0, 0.5, 0.5,

    -0.8212903225806452,0.29032258064516125,0.871225806451613,1.0,	0.5, 0.0, 1.0,
    0.21154838709677426,0.16161290322580646,0.871225806451613,1.0,	0.5, 0.5, 0.0,
    0.21154838709677426,0.29032258064516125,0.871225806451613,1.0,	0.0, 0.0, 1.0,
    -0.8212903225806452,0.29032258064516125,-0.16161290322580635,1.0,	0.25, 0.25, 1.0,
    -0.8212903225806452,0.16161290322580646,-0.16161290322580635,1.0,	1.0, 0.25, 0.25,
    -0.8212903225806452,0.16161290322580646,0.871225806451613,1.0,	0.5, 0.5, 1.0,

    -0.8212903225806452,0.29032258064516125,-0.16161290322580635,1.0,	0.25, 0.25, 1.0,
    -0.8212903225806452,0.16161290322580646,0.871225806451613,1.0,	0.5, 0.5, 1.0,
    -0.8212903225806452,0.29032258064516125,0.871225806451613,1.0,	0.5, 0.0, 1.0,
    0.21154838709677426,0.16161290322580646,-0.16161290322580635,1.0,	0.5, 0.0, 0.0,
    0.21154838709677426,0.16161290322580646,-0.29032258064516125,1.0,	0.5, 0.0, 0.5,
    -0.8212903225806452,0.16161290322580646,-0.16161290322580635,1.0,	1.0, 0.25, 0.25,

    -0.8212903225806452,0.16161290322580646,-0.29032258064516125,1.0,	0.25, 1.0, 0.25,
    -0.8212903225806452,0.16161290322580646,-0.16161290322580635,1.0,	1.0, 0.25, 0.25,
    0.21154838709677426,0.16161290322580646,-0.29032258064516125,1.0,	0.5, 0.0, 0.5,
    -0.8212903225806452,-1.0,0.871225806451613,1.0,	0.0, 0.75, 0.25,
    -0.8212903225806452,-0.8712903225806452,0.871225806451613,1.0,	0.5, 0.5, 0.5,
    -0.8212903225806452,-0.8712903225806452,-0.16161290322580635,1.0,	0.75, 0.25, 0.0,

    -0.8212903225806452,-1.0,0.871225806451613,1.0,	0.0, 0.75, 0.25,
    -0.8212903225806452,-0.8712903225806452,-0.16161290322580635,1.0,	0.75, 0.25, 0.0,
    -0.8212903225806452,-1.0,-0.16161290322580635,1.0,	0.25, 0.0, 0.75,
    0.21154838709677426,0.16161290322580646,1.0,1.0,	1.0, 0.0, 0.0,
    0.21154838709677426,0.16161290322580646,0.871225806451613,1.0,	0.5, 0.5, 0.0,
    -0.8212903225806452,0.16161290322580646,1.0,1.0,	0.5, 1.0, 1.0,

    -0.8212903225806452,-0.8712903225806452,-0.29032258064516125,1.0,	0.0, 0.25, 0.75,
    -0.8212903225806452,-0.8712903225806452,-0.16161290322580635,1.0,	0.75, 0.25, 0.0,
    -0.8212903225806452,0.16161290322580646,-0.16161290322580635,1.0,	1.0, 0.25, 0.25,
    -0.8212903225806452,-0.8712903225806452,-0.29032258064516125,1.0,	0.0, 0.25, 0.75,
    -0.8212903225806452,0.16161290322580646,-0.16161290322580635,1.0,	1.0, 0.25, 0.25,
    -0.8212903225806452,0.16161290322580646,-0.29032258064516125,1.0,	0.25, 1.0, 0.25,

    0.21154838709677426,-0.8712903225806452,-0.29032258064516125,1.0,	0.0, 0.5, 0.5,
    -0.8212903225806452,-0.8712903225806452,-0.29032258064516125,1.0,	0.0, 0.25, 0.75,
    0.21154838709677426,0.16161290322580646,-0.29032258064516125,1.0,	0.5, 0.0, 0.5,
    -0.8212903225806452,0.16161290322580646,-0.29032258064516125,1.0,	0.25, 1.0, 0.25,
    0.21154838709677426,0.16161290322580646,-0.29032258064516125,1.0,	0.5, 0.0, 0.5,
    -0.8212903225806452,-0.8712903225806452,-0.29032258064516125,1.0,	0.0, 0.25, 0.75,

    -0.8212903225806452,-1.0,-0.16161290322580635,1.0,	0.25, 0.0, 0.75,
    0.21154838709677426,-1.0,-0.16161290322580635,1.0,	0.0, 0.0, 0.0,
    -0.8212903225806452,-1.0,0.871225806451613,1.0,	0.0, 0.75, 0.25,
    0.21154838709677426,-1.0,0.871225806451613,1.0,	0.75, 0.0, 0.25,
    -0.8212903225806452,-1.0,0.871225806451613,1.0,	0.0, 0.75, 0.25,
    0.21154838709677426,-1.0,-0.16161290322580635,1.0,	0.0, 0.0, 0.0,

    0.21154838709677426,0.29032258064516125,-0.16161290322580635,1.0,	0.0, 0.0, 0.5,
    -0.8212903225806452,0.29032258064516125,-0.16161290322580635,1.0,	0.25, 0.25, 1.0,
    0.21154838709677426,0.29032258064516125,0.871225806451613,1.0,	0.0, 0.0, 1.0,
    -0.8212903225806452,0.29032258064516125,0.871225806451613,1.0,	0.5, 0.0, 1.0,
    0.21154838709677426,0.29032258064516125,0.871225806451613,1.0,	0.0, 0.0, 1.0,
    -0.8212903225806452,0.29032258064516125,-0.16161290322580635,1.0,	0.25, 0.25, 1.0,
    
    -0.935483870967742,0.16161290322580646,0.871225806451613,1.0,	1.0, 0.5, 0.5,
    -0.8212903225806452,0.16161290322580646,0.871225806451613,1.0,	0.5, 0.5, 1.0,
    -0.8212903225806452,0.16161290322580646,-0.16161290322580635,1.0,	1.0, 0.25, 0.25,
    -0.935483870967742,0.16161290322580646,0.871225806451613,1.0,	1.0, 0.5, 0.5,
    -0.8212903225806452,0.16161290322580646,-0.16161290322580635,1.0,	1.0, 0.25, 0.25,
    -0.935483870967742,0.16161290322580646,-0.16161290322580635,1.0,	1.0, 0.0, 1.0,

  ]);
  var nn = 12+36+60+180;		// tetrahedron, cube, hexagonal prism, extruded cube

  // Create a buffer object
  var shapeBufferHandle = gl.createBuffer();
  if (!shapeBufferHandle) {
    console.log('Failed to create the shape buffer object');
    return false;
  }

  // Bind the the buffer object to target:
  gl.bindBuffer(gl.ARRAY_BUFFER, shapeBufferHandle);
  // Transfer data from Javascript array colorShapes to Graphics system VBO
  // (Use sparingly--may be slow if you transfer large shapes stored in files)
  gl.bufferData(gl.ARRAY_BUFFER, colorShapes, gl.STATIC_DRAW);

  var FSIZE = colorShapes.BYTES_PER_ELEMENT; // how many bytes per stored value?

  // Connect a VBO Attribute to Shaders------------------------------------------
  //Get GPU's handle for our Vertex Shader's position-input variable: 
  var a_PositionLoc = gl.getAttribLocation(gl.program, 'a_Position');
  if (a_PositionLoc < 0) {
    console.log('Failed to get attribute storage location of a_Position');
    return -1;
  }
  // Use handle to specify how to Vertex Shader retrieves position data from VBO:
  gl.vertexAttribPointer(
    a_PositionLoc, 	// choose Vertex Shader attribute to fill with data
    4, 						// how many values? 1,2,3 or 4.  (we're using x,y,z,w)
    gl.FLOAT, 		// data type for each value: usually gl.FLOAT
    false, 				// did we supply fixed-point data AND it needs normalizing?
    FSIZE * 7, 		// Stride -- how many bytes used to store each vertex?
    // (x,y,z,w, r,g,b) * bytes/value
    0);						// Offset -- now many bytes from START of buffer to the
  // value we will actually use?
  gl.enableVertexAttribArray(a_PositionLoc);
  // Enable assignment of vertex buffer object's position data
  //-----------done.
  // Connect a VBO Attribute to Shaders-------------------------------------------
  // Get graphics system's handle for our Vertex Shader's color-input variable;
  var a_ColorLoc = gl.getAttribLocation(gl.program, 'a_Color');
  if (a_ColorLoc < 0) {
    console.log('Failed to get the attribute storage location of a_Color');
    return -1;
  }
  // Use handle to specify how Vertex Shader retrieves color data from our VBO:
  gl.vertexAttribPointer(
    a_ColorLoc, 				// choose Vertex Shader attribute to fill with data
    3, 							// how many values? 1,2,3 or 4. (we're using R,G,B)
    gl.FLOAT, 			// data type for each value: usually gl.FLOAT
    false, 					// did we supply fixed-point data AND it needs normalizing?
    FSIZE * 7, 			// Stride -- how many bytes used to store each vertex?
    // (x,y,z,w, r,g,b) * bytes/value
    FSIZE * 4);			// Offset -- how many bytes from START of buffer to the
  // value we will actually use?  Need to skip over x,y,z,w 									
  gl.enableVertexAttribArray(a_ColorLoc);
  // Enable assignment of vertex buffer object's position data
  //-----------done.
  // UNBIND the buffer object: we have filled the VBO & connected its attributes
  // to our shader, so no more modifications needed.
  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  return nn;
}


function draw_cuboid(modelMatrix, u_ModelLoc, scale) {

  modelMatrix.scale(scale[0], scale[1], scale[2]);
  // DRAW CUBE:		Use ths matrix to transform & draw
  //						the second set of vertices stored in our VBO:
  gl.uniformMatrix4fv(u_ModelLoc, false, modelMatrix.elements);
  // Draw just the first set of vertices: start at vertex SHAPE_0_SIZE
  gl.drawArrays(gl.TRIANGLES,           // draw triangles from verts in VBO
    12,                     // start at vertex 12,
    36);                    // and draw exactly 36 vertices.
}

function draw_hexprism(modelMatrix, u_ModelLoc, scale) {
  modelMatrix.scale(scale[0], scale[1], scale[2]);
  modelMatrix.translate(1 / 3, 1 / 3, 0.0);
  // DRAW CUBE:		Use ths matrix to transform & draw
  //						the second set of vertices stored in our VBO:
  gl.uniformMatrix4fv(u_ModelLoc, false, modelMatrix.elements);
  // Draw just the first set of vertices: start at vertex SHAPE_0_SIZE

  gl.drawArrays(gl.TRIANGLES, 48, 60);
}


function draw_skeleCore(modelMatrix, u_ModelLoc) {

  pushMatrix(modelMatrix);
    modelMatrix.rotate(spineRotation, 0, 0, 1);
    draw_hexprism(modelMatrix, u_ModelLoc, [0.1, 0.1, 0.3])

  modelMatrix = popMatrix();

  modelMatrix.translate(0.0, 0, 0.3);
  
  modelMatrix.rotate(danceAngle, 0, 1, 0);
  pushMatrix(modelMatrix);
    draw_cuboid(modelMatrix, u_ModelLoc, [0.25, 0.1, 0.05])
  modelMatrix = popMatrix();

  modelMatrix.translate(0.0, 0.0, 0.05)
  modelMatrix.rotate(-10, 1, 0, 0);
  
  pushMatrix(modelMatrix);
    modelMatrix.rotate(-spineRotation, 0, 0, 1);
    draw_hexprism(modelMatrix, u_ModelLoc, [0.1, 0.1, 0.2])
  modelMatrix = popMatrix();

  modelMatrix.translate(0.0, 0, 0.2);
  pushMatrix(modelMatrix);
    draw_cuboid(modelMatrix, u_ModelLoc, [0.35, 0.1, 0.05])
  modelMatrix = popMatrix();
}

function draw_head(modelMatrix, u_ModelLoc) {
  pushMatrix(modelMatrix);
    draw_hexprism(modelMatrix, u_ModelLoc, [0.1, 0.1, 0.2])
  modelMatrix = popMatrix();
  
  pushMatrix(modelMatrix);
    modelMatrix.translate(0, 0.0, 0.2)
    draw_cuboid(modelMatrix, u_ModelLoc, [0.15, 0.15, 0.15])
  modelMatrix = popMatrix();
}

function draw_witherThing(modelMatrix, u_ModelLoc) {
  // indentation really helps me pair up my pushMatrix() and popMatrix()


  modelMatrix.rotate(witherRotation, 0, 1, 0);
  modelMatrix.rotate(-70 - wiggle, 1, 0, 0);

  // modelMatrix.rotate(-70, 1, 0, 0);

  // move to top of skeleton core and draw a head
  pushMatrix(modelMatrix);
    draw_skeleCore(modelMatrix, u_ModelLoc);
  modelMatrix = popMatrix();
  
  // move to "neck joint" of skeleton core
  modelMatrix.translate(0, 0.0, 0.3)
  modelMatrix.rotate(danceAngle, 0, 1, 0);
  modelMatrix.rotate(-10, 1, 0, 0);
  modelMatrix.translate(0, 0.0, 0.25)

  // move to top of neck and draw the main head
  pushMatrix(modelMatrix);

    var headY = Math.min(Math.max(-headtrackDY*25, -45), 45)
    var headX = Math.min(Math.max(headtrackDX*25, -80), 80)
    modelMatrix.rotate(headY, 1, 0, 0);
    modelMatrix.rotate(headX, 0, 0, 1);
    // console.log(headtrackDX, headtrackDY)

    modelMatrix.translate(0, 0.0, 0.1);
    draw_head(modelMatrix, u_ModelLoc);
  modelMatrix = popMatrix();

  // move to "right" side 
  pushMatrix(modelMatrix);
    modelMatrix.translate(-0.28, 0.0, 0.05);
    modelMatrix.rotate(danceAngle, 0, 1, 0);
    modelMatrix.rotate(-20, 0, 1, 0);
    modelMatrix.scale(0.5, 0.5, 0.5);
  
    // ...and create mini skeleton core
    pushMatrix(modelMatrix);
      draw_skeleCore(modelMatrix, u_ModelLoc);
    modelMatrix = popMatrix();

    // move up and draw the mini right head
    modelMatrix.translate(0.0, 0.0, 0.3);
    modelMatrix.rotate(danceAngle, 0, 1, 0);
    modelMatrix.rotate(-10, 1, 0, 0);
    modelMatrix.translate(0.0, 0.0, 0.2);
    modelMatrix.translate(0, 0.0, 0.1);
    modelMatrix.rotate(-Math.abs(rightHeadAngle + 180)/2, 0, 0, 1);
    draw_head(modelMatrix, u_ModelLoc);
  modelMatrix = popMatrix();

  // move to "left" side and create mini skeleton core
  pushMatrix(modelMatrix);
    modelMatrix.translate(0.28, 0.0, 0.05);
    modelMatrix.rotate(danceAngle, 0, 1, 0);
    modelMatrix.rotate(20, 0, 1, 0);
    modelMatrix.scale(0.5, 0.5, 0.5);
    pushMatrix(modelMatrix);
      draw_skeleCore(modelMatrix, u_ModelLoc);
    modelMatrix = popMatrix();

    // move up and draw the mini left head
    modelMatrix.translate(0.0, 0.0, 0.3);
    modelMatrix.rotate(danceAngle, 0, 1, 0);
    modelMatrix.rotate(-10, 1, 0, 0);
    modelMatrix.translate(0.0, 0.0, 0.2);
    modelMatrix.translate(0, 0.0, 0.1);
    modelMatrix.rotate(Math.abs(leftHeadAngle - 180)/2, 0, 0, 1);
    draw_head(modelMatrix, u_ModelLoc);
  modelMatrix = popMatrix();
  
}


function draw_extrudedCube(modelMatrix, u_ModelLoc, scale) {
  modelMatrix.scale(scale[0], scale[1], scale[2]);
  modelMatrix.translate(0.305, 11/31, -11/31);
  gl.uniformMatrix4fv(u_ModelLoc, false, modelMatrix.elements);
  gl.drawArrays(gl.TRIANGLES,108, 180);
}

function draw_guardian(modelMatrix, u_ModelLoc) {
  modelMatrix.rotate(facing-200, 0, 1, 0);
  modelMatrix.rotate(-15, 0, 1, 0);
  modelMatrix.rotate(fishSpinAngle+20, 1, 0, 0);

  pushMatrix(modelMatrix);

    // head
    pushMatrix(modelMatrix);
      draw_extrudedCube(modelMatrix, u_ModelLoc, [.3, .3, .3])
    modelMatrix = popMatrix();

    pushMatrix(modelMatrix);
      modelMatrix.translate(-0.185, 0, 0.0);
      pushMatrix(modelMatrix);

        // eye
        pushMatrix(modelMatrix);
          draw_cuboid(modelMatrix, u_ModelLoc, [0.01, 0.0375 * eyeblink, 0.075])
        modelMatrix = popMatrix();
        
        var eyelocX = Math.min(0.05, Math.max(-0.05, 0.05 * eyetrackDX))
        var eyelocY = Math.min(0.0375, Math.max(0, 0.0375/2 + 0.0375/2 * eyetrackDY))

        modelMatrix.translate(-0.01, -0.0375/2 + eyelocY, eyelocX);
        
        var pupilSize = 0.0375/2
        if (Math.abs(0.0375 * eyeblink) < Math.abs(-0.0375/2 + eyelocY) + pupilSize/2){
          // console.log(0.0375 * eyeblink , -0.0375/2 + eyelocY + pupilSize)
          pupilSize = 0.0
        }
        // pupil
        pushMatrix(modelMatrix);
          draw_cuboid(modelMatrix, u_ModelLoc, [0.001, pupilSize, 0.0375/2])
        modelMatrix = popMatrix();
        
      modelMatrix = popMatrix();

    modelMatrix = popMatrix();
    
    // tail assembly
    pushMatrix(modelMatrix);

      modelMatrix.rotate(fishFlap, 0, 1, 0);
      modelMatrix.translate(0.25, 0.0, 0.0);

      pushMatrix(modelMatrix);
        draw_cuboid(modelMatrix, u_ModelLoc, [0.075, 0.06, 0.06])
      modelMatrix = popMatrix();
      
      
      pushMatrix(modelMatrix);
        
        modelMatrix.rotate(fishFlap, 0, 1, 0);
        modelMatrix.translate(0.125, 0.0, 0.0);

        pushMatrix(modelMatrix);
          draw_cuboid(modelMatrix, u_ModelLoc, [0.05, 0.04, 0.04])
        modelMatrix = popMatrix();
      
        pushMatrix(modelMatrix);
        
          modelMatrix.rotate(fishFlap, 0, 1, 0);
          modelMatrix.translate(0.10, 0.0, 0.0);
        
          pushMatrix(modelMatrix);
            draw_cuboid(modelMatrix, u_ModelLoc, [0.05, 0.02, 0.02])
          modelMatrix = popMatrix();

          modelMatrix.rotate(fishFlap, 0, 1, 0);
          modelMatrix.translate(0.09, 0.0, 0.0);
          
          pushMatrix(modelMatrix);
            draw_cuboid(modelMatrix, u_ModelLoc, [0.06, 0.08, 0.01])
          modelMatrix = popMatrix();

        modelMatrix = popMatrix();
              
      modelMatrix = popMatrix();
    
    modelMatrix = popMatrix();
      
  modelMatrix = popMatrix();
  
  
  
}

function draw(modelMatrix, u_ModelLoc) {
  //==============================================================================
  // Clear <canvas>  colors AND the depth buffer
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  modelMatrix.setTranslate(0, 0, 0.0);
  pushMatrix(modelMatrix);					// SAVE current, uniformly-scaled matrix

  
  //========================
  // draw the wither skeleton
  pushMatrix(modelMatrix);
    modelMatrix.translate(1 / 3 + wanderX, -1 / 3 + wiggle/90, -0.25);
    draw_witherThing(modelMatrix, u_ModelLoc)
  modelMatrix = popMatrix();
  //========================


  

  pushMatrix(modelMatrix);
    modelMatrix.translate(-1 / 3, -1 / 3, 0.5);
    draw_guardian(modelMatrix, u_ModelLoc)
  modelMatrix = popMatrix();

}


function angleCalc(angle, scalar, now, last, angle_step) {
  //==============================================================================
  // Calculate the elapsed time
  var elapsed = now - last;

  // Update the current rotation angle (adjusted by the elapsed time)
  //  limit the angle to move smoothly between +20 and -85 degrees:

  var newAngle = angle + (angle_step * elapsed) * scalar / 1000.0;
  if (newAngle > 360){
    newAngle = newAngle % 360 - 360 // under most circumstances, this will not 
                                    // have any noticable real effect. However, it 
                                    // is useful for when we want to detect 
                                    // complete 360 degree rotations
  }

  return newAngle;
}


function angleCalcTrig(timescalar, maxAngle, now, start, angle_step, startAng = 0) {
  //==============================================================================
  // Calculate the elapsed time

  // Update the current rotation angle (adjusted by the elapsed time)
  //  limit the angle to move smoothly between +20 and -85 degrees:
  var elapsed = now - start;
  var newAngle = (angle_step * (elapsed) * (timescalar / 120) / (1000.0)) % (Math.PI*2) ;
  
  return maxAngle * Math.cos(newAngle + startAng *(Math.PI /180));
}


var blinking = false;
var eyeblink = 1;
var spinny = false;
var danceStopTime = false;

//==================HTML Button Callbacks
function blink() {
  blinking = true
}

function roll() {
  spinny = true
}
function dance() {
  danceStopTime = true
}

function spinUp() {
  ANGLE_STEP = Math.min(ANGLE_STEP + 10, 100)
}
function spinMax() {
  ANGLE_STEP = 100
}

function spinDown() { 
  ANGLE_STEP = Math.max(ANGLE_STEP - 10, 0)
}

function runStop() {
  running = !running;
}


var blinking = -1;
var eyeblink = 1;
var spinny = -1;
var danceStopTime = -1;

function blink() {
  blinking = Date.now() - 40

}

function roll() {
  spinny = 1
}
function dance() {
  danceStopTime = Date.now() + danceDuration
}

function showKeys(){
  alert("The following alerts will explain what interactions can be used.");
  alert("The 'Blink' button makes the Guardian (fish like thing) blink its bid ol'"
  +" eye, while 'Roll' will make it do a barrel roll!");
  alert("Pressing the 'a' key will turn the Guardian towards its right.");
  alert("Pressing the 'd' key will turn the Guardian towards its left.");
  alert("The 'Dance' button will make the Wither (floaty guy with three heads) "
  +"do a little jiggle movement.")
  alert("The slider next to the 'Dance' button controls the minimum dance duration, while"
  +" The current 'dance duration' is displayed underneath")
  alert("Mouse drag also does things!")
  alert("In fact, it can do to things depending on the toggle under 'Other Things'.")
  alert("When the checkbocks is selected, as you click or drag around, the guardian"
  +" will move its eye to look at your mouse.")
  alert("If the checkbox is deselected, dragging around moves the direction the Wither's"
  +" main head faces.")
  alert("unlike withe the Guardian, the drag movement for the wither is cumulative, "
  +"rather than facing your mouse.")
  alert("You can see which mode your mouse drag movement is in via the text after the checkbox.")


}

function myKeyDown(kev) {
  //===============================================================================
  // Called when user presses down ANY key on the keyboard;
  //
  // For a light, easy explanation of keyboard events in JavaScript,
  // see:    http://www.kirupa.com/html5/keyboard_events_in_javascript.htm
  // For a thorough explanation of a mess of JavaScript keyboard event handling,
  // see:    http://javascript.info/tutorial/keyboard-events
  //
  // NOTE: Mozilla deprecated the 'keypress' event entirely, and in the
  //        'keydown' event deprecated several read-only properties I used
  //        previously, including kev.charCode, kev.keyCode. 
  //        Revised 2/2019:  use kev.key and kev.code instead.
  //
  // Report EVERYTHING in console:
    console.log(  "--kev.code:",    kev.code,   "\t\t--kev.key:",     kev.key, 
                "\n--kev.ctrlKey:", kev.ctrlKey,  "\t--kev.shiftKey:",kev.shiftKey,
                "\n--kev.altKey:",  kev.altKey,   "\t--kev.metaKey:", kev.metaKey);
  
    switch(kev.code) {
      case "KeyP":
        console.log("Pause/unPause!\n"); 
        if(g_isRun==true) {
          g_isRun = false;    // STOP animation
          }
        else {
          g_isRun = true;     // RESTART animation
          tick();
          }
        break;
      //------------------WASD navigation-----------------
      case "KeyA":
        console.log("a/A key: Rotate LEFT!\n");
        facing = angleCalc(facing , -5, now, g_last, 20);
        break;
      case "KeyD":
        console.log("d/D key: Rotate RIGHT!\n");
        facing = angleCalc(facing , 5, now, g_last, 20);
        break;
      case "KeyS":
        console.log("s/S key: Move BACK!\n");
        break;
      case "KeyW":
        console.log("w/W key: Move FWD!\n");
        break;
      //----------------Arrow keys------------------------
      case "ArrowLeft": 	
        console.log(' left-arrow.');
        break;
      case "ArrowRight":
        console.log('right-arrow.');
        break;
      case "ArrowUp":		
        console.log('   up-arrow.');
        break;
      case "ArrowDown":
        console.log(' down-arrow.');
        break;	
      case "Space":
        console.log(' SPACE.');
        break;	
      default:
        console.log("UNUSED!");
          'myKeyDown(): UNUSED!';
        break;
    }
  }


  
function myMouseDown(ev) {
  //==============================================================================
  // Called when user PRESSES down any mouse button;
  // 									(Which button?    console.log('ev.button='+ev.button);   )
  // 		ev.clientX, ev.clientY == mouse pointer location, but measured in webpage 
  //		pixels: left-handed coords; UPPER left origin; Y increases DOWNWARDS (!)  
  
  // Create right-handed 'pixel' coords with origin at WebGL canvas LOWER left;
    var rect = ev.target.getBoundingClientRect();	// get canvas corners in pixels
    var xp = ev.clientX - rect.left;									// x==0 at canvas left edge
    var yp = myCanvas.height - (ev.clientY - rect.top);	// y==0 at canvas bottom edge
  //  console.log('myMouseDown(pixel coords): xp,yp=\t',xp,',\t',yp);
    
    // Convert to Canonical View Volume (CVV) coordinates too:
    var x = (xp - myCanvas.width/2)  / 		// move origin to center of canvas and
                 (myCanvas.width/2);			// normalize canvas to -1 <= x < +1,
    var y = (yp - myCanvas.height/2) /		//										 -1 <= y < +1.
                 (myCanvas.height/2);
  //	console.log('myMouseDown(CVV coords  ):  x, y=\t',x,',\t',y);
    
    g_isDrag = true;											// set our mouse-dragging flag
    g_xMclik = x;													// record where mouse-dragging began
    g_yMclik = y;
    // report on webpage
    console.log('Mouse Down At: '+x.toFixed(g_digits)+', '+y.toFixed(g_digits));

  if (eyeball){
    eyetrackDX = x + 1/3;
    eyetrackDY = y + 1/3;
    headtrackDX = 0.0;
    headtrackDY = 0.0;
  }
  else{
    eyetrackDX = 0.0;
    eyetrackDY = 0.0;
    headtrackDX = g_xMdragTot;
    headtrackDY = g_yMdragTot;
  }



};
  

function myMouseMove(ev) {
//==============================================================================
// Called when user MOVES the mouse with a button already pressed down.
// 									(Which button?   console.log('ev.button='+ev.button);    )
// 		ev.clientX, ev.clientY == mouse pointer location, but measured in webpage 
//		pixels: left-handed coords; UPPER left origin; Y increases DOWNWARDS (!)  

  if(g_isDrag==false) return;				// IGNORE all mouse-moves except 'dragging'

  // Create right-handed 'pixel' coords with origin at WebGL canvas LOWER left;
  var rect = ev.target.getBoundingClientRect();	// get canvas corners in pixels
  var xp = ev.clientX - rect.left;									// x==0 at canvas left edge
  var yp = myCanvas.height - (ev.clientY - rect.top);	// y==0 at canvas bottom edge
//  console.log('myMouseMove(pixel coords): xp,yp=\t',xp,',\t',yp);
  
  // Convert to Canonical View Volume (CVV) coordinates too:
  var x = (xp - myCanvas.width/2)  / 		// move origin to center of canvas and
                (myCanvas.width/2);		// normalize canvas to -1 <= x < +1,
  var y = (yp - myCanvas.height/2) /		//										-1 <= y < +1.
                (myCanvas.height/2);

//	console.log('myMouseMove(CVV coords  ):  x, y=\t',x,',\t',y);

  // find how far we dragged the mouse:
  g_xMdragTot += (x - g_xMclik);			// Accumulate change-in-mouse-position,&
  g_yMdragTot += (y - g_yMclik);
  
  // console.log('Mouse At: '+x.toFixed(g_digits)+', '+y.toFixed(g_digits));

  if (eyeball){
    eyetrackDX = x + 1/3;
    eyetrackDY = y + 1/3;
    headtrackDX = 0.0;
    headtrackDY = 0.0;
  }
  else{
    eyetrackDX = 0.0;
    eyetrackDY = 0.0;
    headtrackDX = g_xMdragTot;
    headtrackDY = g_yMdragTot;
  }


  g_xMclik = x;											// Make next drag-measurement from here.
  g_yMclik = y;


};

function myMouseUp(ev) {
//==============================================================================
// Called when user RELEASES mouse button pressed previously.
// 									(Which button?   console.log('ev.button='+ev.button);    )
// 		ev.clientX, ev.clientY == mouse pointer location, but measured in webpage 
//		pixels: left-handed coords; UPPER left origin; Y increases DOWNWARDS (!)  

// Create right-handed 'pixel' coords with origin at WebGL canvas LOWER left;
  var rect = ev.target.getBoundingClientRect();	// get canvas corners in pixels
  var xp = ev.clientX - rect.left;									// x==0 at canvas left edge
  var yp = myCanvas.height - (ev.clientY - rect.top);	// y==0 at canvas bottom edge
//  console.log('myMouseUp  (pixel coords):\n\t xp,yp=\t',xp,',\t',yp);
  
  // Convert to Canonical View Volume (CVV) coordinates too:
  var x = (xp - myCanvas.width/2)  / 		// move origin to center of canvas and
                (myCanvas.width/2);			// normalize canvas to -1 <= x < +1,
  var y = (yp - myCanvas.height/2) /		//										 -1 <= y < +1.
                (myCanvas.height/2);
  
  g_isDrag = false;											// CLEAR our mouse-dragging flag, and
  // accumulate any final bit of mouse-dragging we did:
  g_xMdragTot += (x - g_xMclik);
  g_yMdragTot += (y - g_yMclik);
  // Report new mouse position:
  
  if (eyeball){
    eyetrackDX = x + 1/3;
    eyetrackDY = y + 1/3;
    headtrackDX = 0.0;
    headtrackDY = 0.0;
  }
  else{
    eyetrackDX = 0.0;
    eyetrackDY = 0.0;
    headtrackDX = g_xMdragTot;
    headtrackDY = g_yMdragTot;
  }
  
  console.log('Mouse Up At: '+x.toFixed(g_digits)+', '+y.toFixed(g_digits));
};

function myMouseClick(ev) {
//=============================================================================
// Called when user completes a mouse-button single-click event 
// (e.g. mouse-button pressed down, then released)
// 									   
//    WHICH button? try:  console.log('ev.button='+ev.button); 
// 		ev.clientX, ev.clientY == mouse pointer location, but measured in webpage 
//		pixels: left-handed coords; UPPER left origin; Y increases DOWNWARDS (!) 
//    See myMouseUp(), myMouseDown() for conversions to  CVV coordinates.

  // STUB
  console.log("myMouseClick() on button: ", ev.button); 
}	

function myMouseDblClick(ev) {
//=============================================================================
// Called when user completes a mouse-button double-click event 
// 									   
//    WHICH button? try:  console.log('ev.button='+ev.button); 
// 		ev.clientX, ev.clientY == mouse pointer location, but measured in webpage 
//		pixels: left-handed coords; UPPER left origin; Y increases DOWNWARDS (!) 
//    See myMouseUp(), myMouseDown() for conversions to  CVV coordinates.

  // STUB
  console.log("myMouse-DOUBLE-Click() on button: ", ev.button); 
}	

function updateSliderAndDisplay() {
  const slider = document.getElementById("danceDurationSlider");
  const display = document.getElementById("currentDuration");
  
  document.getElementById("danceDurationSlider").addEventListener("input", function() {
    danceDuration = parseInt(this.value);
  });
  slider.value = danceDuration;
  display.textContent = danceDuration;
}


function updateCheckboxState() {
  const checkbox = document.getElementById("eyeballToggle");
  checkbox.checked = eyeball;
  document.getElementById("eyeballToggle").addEventListener("change", function() {
    eyeball = this.checked;
  });

  if (!eyeball){
    
    eyetrackDX = 0.0;
    eyetrackDY = 0.0;
  }


}
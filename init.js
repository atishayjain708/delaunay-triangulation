var canvas = document.getElementById("canvas"),
          canv = canvas.getContext("2d"),
          // ver_arr contains 200 random points
          ver_arr = new Array(200),
          i, x, y;
      // Point generation
      for(i = ver_arr.length; i--; ) {
        do {
          // adjusting for display as a circle
          x=Math.random()-0.5;
          y=Math.random()-0.5;
        } while(x*x+y*y>0.25);

        // Scale points by canvas height and width
        x = (x + 0.5) * canvas.width;
        y = (y + 0.5) * canvas.height;

        ver_arr[i] = [x, y];
      }

      console.time("triangulate");
      var triangles = Delaunay.triangulate(ver_arr);
      console.timeEnd("triangulate");

      // Printing the triangulation
      for(i = triangles.length; i; ) {
        canv.beginPath();
        i--; 
        canv.moveTo(ver_arr[triangles[i]][0], ver_arr[triangles[i]][1]);
        i--; 
        canv.lineTo(ver_arr[triangles[i]][0], ver_arr[triangles[i]][1]);
        i--; 
        canv.lineTo(ver_arr[triangles[i]][0], ver_arr[triangles[i]][1]);
        canv.closePath();
        canv.stroke();
      }
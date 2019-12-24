var Delaunay;

(function() {
  "use strict";
  /*
  EPS (short for epsilon) is the error threshold. Used to check for existing coincident points.
  Used in circumcircle function.
  */
  var EPS=1.0/1048576.0;

  function super_triangle(ver_arr) {
    var x_min=Number.POSITIVE_INFINITY,
        y_min=Number.POSITIVE_INFINITY,
        x_max=Number.NEGATIVE_INFINITY,
        y_max=Number.NEGATIVE_INFINITY,
        i, dx, dy, dmax, mid_x, mid_y;

    for(i=ver_arr.length; i--; ) {
      if(ver_arr[i][0] < x_min) x_min=ver_arr[i][0];
      if(ver_arr[i][0] > x_max) x_max=ver_arr[i][0];
      if(ver_arr[i][1] < y_min) y_min=ver_arr[i][1];
      if(ver_arr[i][1] > y_max) y_max=ver_arr[i][1];
    }

    dx=x_max - x_min;
    dy=y_max - y_min;
    dmax=Math.max(dx, dy);
    mid_x=x_min+dx*0.5;
    mid_y=y_min+dy*0.5;

    /*
    Return a triplet. Set of three points constituting the triangles in our triangulation
    */
    return [
      [mid_x - 20*dmax, mid_y -      dmax],
      [mid_x , mid_y+20*dmax],
      [mid_x+20*dmax, mid_y -      dmax]
    ];
  }

  function circumcircle(ver_arr, i, j, k) {
    var x1=ver_arr[i][0],
        y1=ver_arr[i][1],
        x2=ver_arr[j][0],
        y2=ver_arr[j][1],
        x3=ver_arr[k][0],
        y3=ver_arr[k][1],
        fabsy1y2=Math.abs(y1 - y2),
        fabsy2y3=Math.abs(y2 - y3),
        xc, yc, m1, m2, mx1, mx2, my1, my2, dx, dy;

    /* 
    Coincident point check
    */
    if(fabsy1y2 < EPS && fabsy2y3 < EPS)
      throw new Error("Eek! Coincident points!");

    if(fabsy1y2 < EPS) {
      m2 =-((x3 - x2)/(y3 - y2));
      mx2=(x2+x3)/2.0;
      my2=(y2+y3)/2.0;
      xc =(x2+x1)/2.0;
      yc =m2*(xc - mx2)+my2;
    }

    else if(fabsy2y3 < EPS) {
      m1 =-((x2 - x1)/(y2 - y1));
      mx1=(x1+x2)/2.0;
      my1=(y1+y2)/2.0;
      xc =(x3+x2)/2.0;
      yc =m1*(xc - mx1)+my1;
    }

    else {
      m1 =-((x2 - x1)/(y2 - y1));
      m2 =-((x3 - x2)/(y3 - y2));
      mx1=(x1+x2)/2.0;
      mx2=(x2+x3)/2.0;
      my1=(y1+y2)/2.0;
      my2=(y2+y3)/2.0;
      xc =(m1*mx1 - m2*mx2+my2 - my1)/(m1 - m2);
      yc =(fabsy1y2 > fabsy2y3) ?
        m1*(xc - mx1)+my1 :
        m2*(xc - mx2)+my2;
    }

    dx=x2 - xc;
    dy=y2 - yc;
    return {i: i, j: j, k: k, x: xc, y: yc, r: dx*dx+dy*dy};
  }
  /* Remove dup edges */
  function dedup(edges) {
    var i, j, a, b, m, n;

    for(j=edges.length; j; ) {
      b=edges[--j];
      a=edges[--j];

      for(i=j; i; ) {
        n=edges[--i];
        m=edges[--i];

        if((a===m && b===n) || (a===n && b===m)) {
          edges.splice(j, 2);
          edges.splice(i, 2);
          break;
        }
      }
    }
  }

  Delaunay={
    triangulate: function(ver_arr, key) {
      var n=ver_arr.length,
          i, j, indices, st, open, closed, edges, dx, dy, a, b, c;

      /* 
      If there are not enough vertices (less than 3) to form triangles, return.
      */
      if(n < 3)
        return [];

      /* 
      Obtain the actual vertices (By slicing) from the objects that are passed.
      (We duplicate the
      *array since we want to create supertriangle afterwards.
      */
      ver_arr=ver_arr.slice(0);

      if(key)
        for(i=n; i--; )
          ver_arr[i]=ver_arr[i][key];

      /* 
      Make an array of indices into the vertex array, sorted by the
      *ver_arr' x-position. Force stable sorting by comparing indices if
      *the x-positions are equal. */
      indices=new Array(n);

      for(i=n; i--; )
        indices[i]=i;

      indices.sort(function(i, j) {
        var diff=ver_arr[j][0] - ver_arr[i][0];
        return diff !== 0 ? diff : i - j;
      });

      /* 
      Now, we find those vertices of supertriangle (which contains all other
      triangles), and append em to the end of a (duplicate copy of) the vertex
      array. 
      */
      st=super_triangle(ver_arr);
      ver_arr.push(st[0], st[1], st[2]);
      
      /* 
      Initializing open and closed lists.
      Open list contains the supertriangle and nothing else. Closed list is empty.
      */
      open  =[circumcircle(ver_arr, n+0, n+1, n+2)];
      closed=[];
      edges =[];

      /* 
      Incrementally keep adding one vertex at a time to the mesh. 
      */
      for(i=indices.length; i--; edges.length=0) {
        c=indices[i];

        /* 
        For every open triangle, we check & see if the current point
        lies inside it's circumcircle. If yes, we remove the triangle & add
        its edges to a edge list. 
        */
        for(j=open.length; j--; ) {
          /* 
          If this point is in the right of this triangle's circumcircle,
          *then this triangle should never get checked again. Remove it
          *from the open list, add it to the closed list, and skip. */
          dx=ver_arr[c][0] - open[j].x;
          if(dx > 0.0 && dx*dx > open[j].r) {
            closed.push(open[j]);
            open.splice(j, 1);
            continue;
          }

          /* If we're outside the circumcircle, skip this triangle. */
          dy=ver_arr[c][1] - open[j].y;
          if(dx*dx+dy*dy - open[j].r > EPS)
            continue;

          /* Remove the triangle and add it's edges to the edge list. */
          edges.push(
            open[j].i, open[j].j,
            open[j].j, open[j].k,
            open[j].k, open[j].i
          );
          open.splice(j, 1);
        }

        /* 
        Removing duplicated edges. 
        */
        dedup(edges);

        /* 
        Adding one new triangle for each edge. 
        */
        for(j=edges.length; j; ) {
          b=edges[--j];
          a=edges[--j];
          open.push(circumcircle(ver_arr, a, b, c));
        }
      }

      /* 
      1. Copy remaining open triangles to closed list
      Then we remove triangles that share one or more vertex with our supertriangle,
      And build a list of triplets representing triangles. 
      */
      for(i=open.length; i--; )
        closed.push(open[i]);
      open.length=0;

      for(i=closed.length; i--; )
        if(closed[i].i < n && closed[i].j < n && closed[i].k < n)
          open.push(closed[i].i, closed[i].j, closed[i].k);

      /* All done */
      return open;
    },
    contains: function(tri, p) {
      /* Bounding box test first, for quick rejections. */
      if((p[0] < tri[0][0] && p[0] < tri[1][0] && p[0] < tri[2][0]) ||
         (p[0] > tri[0][0] && p[0] > tri[1][0] && p[0] > tri[2][0]) ||
         (p[1] < tri[0][1] && p[1] < tri[1][1] && p[1] < tri[2][1]) ||
         (p[1] > tri[0][1] && p[1] > tri[1][1] && p[1] > tri[2][1]))
        return null;

      var a=tri[1][0] - tri[0][0],
          b=tri[2][0] - tri[0][0],
          c=tri[1][1] - tri[0][1],
          d=tri[2][1] - tri[0][1],
          i=a*d - b*c;

      /* Degenerate triangle */
      if(i===0.0)
        return null;

      var u=(d*(p[0] - tri[0][0]) - b*(p[1] - tri[0][1]))/i,
          v=(a*(p[1] - tri[0][1]) - c*(p[0] - tri[0][0]))/i;

      /* If outside the triangle, return that failed (null)*/
      if(u < 0.0 || v < 0.0 || (u+v) > 1.0)
        return null;

      return [u, v];
    }
  };

  if(typeof module !== "undefined")
    module.exports=Delaunay;
})();

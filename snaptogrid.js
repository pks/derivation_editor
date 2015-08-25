var el;
window.onload = function () {
  var color, i, ii, tempS, tempT,
    dragger = function ()
    {
      el = this;
      this.ox = this.type == "rect" ? this.attr("x") : this.attr("cx");
      this.oy = this.type == "rect" ? this.attr("y") : this.attr("cy");
    },
    move = function (dx, dy)
    {
      var att = this.type == "rect" ? {x: this.ox + dx, y: this.oy } : {cx: this.ox + dx, cy: this.oy };
      this.attr(att);
      r.safari();
    },
    collide = function (obj)
    {
      document.getElementById("debug").innerHTML = el["id"] + " <-> " + obj["id"]
      ee = shapesById[obj["id"]];
      if (el["grid"] > ee["grid"]) {
        if (el.getBBox().width < obj.getBBox().width &&
            el.getBBox().x > (obj.getBBox().x+obj.getBBox().width/2)) {
          return;
        }
        att = {x: ee.attr("x")+el.getBBox().width+10};
        ee.attr(att);
      } else {
        if (el.getBBox().width < obj.getBBox().width &&
            el.getBBox().x < (obj.getBBox().x+obj.getBBox().width/2)) {
          return;
        }
        att = {x: ee.attr("x")-(el.getBBox().width+10)};
        ee.attr(att);
      }

      var tmp = el["grid"];
      el["grid"] = obj["grid"];
      obj["grid"] = tmp;
    },
    up = function ()
    {
      snapToGrid(this);
    }
    snapToGrid = function (obj)
    {
      // y
      var sy = 50;
      if (obj.getBBox().y != sy) {
        att = {y: sy};
        obj.animate(att, 250);
      }
      // x
      /*if (el.getBBox().x != el["grid"]*70) {
        att = {x:el["grid"]*70};
        obj.animate(att,250);
      }*/
      
      var d = 0;
      for (var i = 0; i < 4; i++) {
        obj = null
        for (var j = 0; j < shapes.length; j++) {
          obj = shapesById[j];
          if (obj["grid"] == i)
            break;
        }
        att = {x:d};
        obj.animate(att,250);
        d += obj.getBBox().width+10;
      }
    };
  r = Raphael("holder", 280, 100),
  xAnchors = [ 0, 20, 60, 130 ]
  shapes = [
             r.rect(xAnchors[0], 50, 10, 30, 0),
             r.rect(xAnchors[1], 50, 30, 30, 0),
             r.rect(xAnchors[2], 50, 60, 30, 0),
             r.rect(xAnchors[3], 50, 30, 30, 0),
           ];
  colors = [ "#000", "#ccc", "#0f0", "#00f" ];
  shapesById  = {};
  for (var i = 0; i < shapes.length; i++) {
    shapes[i].attr({fill: colors[i], cursor: "move"});
    shapes[i].drag(move, dragger, up).onDragOver( function(a) { collide(a);});
    shapes[i]["id"] = i;
    shapes[i]["grid"] = i;
    shapesById[i] = shapes[i];
  }

};


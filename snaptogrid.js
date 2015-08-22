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
      if (el.getBBox().x > ee.getBBox().x) { 
        att = {x: ee.attr("x")+70};
        ee.attr(att);
      } else {
        att = {x: ee.attr("x")-70};
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
      if (el.getBBox().x != el["grid"]*70) {
        att = {x:el["grid"]*70};
        obj.animate(att,250);
      }
      
      for (var i = 0; i < 4; i++) {
        obj = shapesById[i];
        att = {x:obj["grid"]*70};
        obj.animate(att,250);
      }
    };
  r = Raphael("holder", 280, 100),
  shapes = [
             r.rect(0,   50, 60, 30, 0),
             r.rect(70,  50, 60, 30, 0),
             r.rect(140, 50, 60, 30, 0),
             r.rect(210, 50, 60, 30, 0),
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


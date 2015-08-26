Raphael.fn.connection = function (obj1, obj2, line, bg) {
  if (obj1.line && obj1.from && obj1.to) {
    line = obj1;
    obj1 = line.from;
    obj2 = line.to;
  }
  var bb1 = obj1.getBBox(),
      bb2 = obj2.getBBox();
  var x1 = bb1.x+bb1.width/2,
      y1 = bb1.y+bb1.height,
      x2 = bb2.x+bb2.width/2,
      y2 = bb2.y;
  var path = ["M", x1, y1, "L", x2, y2];
  if (line && line.line) {
    line.bg && line.bg.attr({path: path});
    line.line.attr({path: path});
  } else {
    var color = typeof line == "string" ? line : "#000";
    return {
      bg: bg && bg.split && this.path(path).attr({stroke: bg.split("|")[0], fill: "none", "stroke-width": bg.split("|")[1] || 3}),
      line: this.path(path).attr({stroke: color, fill: "none"}),
      from: obj1,
      to: obj2
    };
  }
};

add_obj = function()
{
  r.rect(350,105,100,40);
}

var shapes_by_id = {},
    curDrag = null,
    shapes = [],
    texts = [],
    r;
window.onload = function () {
  r = Raphael("holder", 640, 200); // FIXME: variable sz
  var dragger = function () {
        curDrag = this;
        if (this.type == "text")
          curDrag = this.pair;
        // remember original coords
        this.ox = this.attr("x");
        this.oy = this.attr("y");
        this.pair.ox = this.pair.attr("x");
        this.pair.oy = this.pair.attr("y");
        if (this.type != "text")
          this.animate({ "fill-opacity": .2 }, 500);
        if (this.pair.type != "text")
          this.pair.animate({ "fill-opacity": .2 }, 500);
    },
    move = function (dx, dy) {
      var att = { x: this.ox + dx, y: this.oy };
      this.attr(att);
      att = { x: this.pair.ox + dx, y: this.pair.oy };
      this.pair.attr(att);
      for (i = connections.length; i--;) {
        r.connection(connections[i]);
      }
      r.safari();
    },
    collide = function collide(obj) {
      if (obj.type != 'rect')
        return;
      if (curDrag["grid_"] > obj["grid_"]) {
        if (curDrag.getBBox().width < obj.getBBox().width &&
            curDrag.getBBox().x > (obj.getBBox().x+obj.getBBox().width/3)) {
          return;
        }
        att = { x: obj.attr("x")+curDrag.getBBox().width+(margin-2*padding) };
        obj.attr(att);
        att = { x: obj.pair.attr("x")+curDrag.getBBox().width+(margin-2*padding) };
        obj.pair.attr(att);
      } else {
        if (curDrag.getBBox().width < obj.getBBox().width &&
            curDrag.getBBox().x < (obj.getBBox().x+obj.getBBox().width/3)) {
          return;
        }
        att = { x: obj.attr("x")-(curDrag.getBBox().width+(margin-2*padding)) };
        obj.attr(att);
        att = { x: obj.pair.attr("x")-(curDrag.getBBox().width+(margin-2*padding)) };
        obj.pair.attr(att);
      }
      // switch grid pos
      var tmpx = curDrag["grid_"];
      curDrag["grid_"] = obj["grid_"];
      obj["grid_"] = tmpx;
    },
    up = function () {
      if (this.type != "text")
        this.animate({"fill-opacity": 0}, 500);
      if (this.pair.type != "text")
        this.pair.animate({"fill-opacity": 0}, 500);

      snapToGrid(this);
    },
    snapToGrid = function (obj)
    {
      // just x coord, y is fixed in drag
      var d = xbegin;
      var d2 = 0;
      for (var i = 0; i < target.length; i++) {
        obj = null
        for (var j = 0; j < target.length; j++) {
          obj = shapes_by_id[j];
          if (obj["grid_"] == i)
            break;
        }
        att = { x:d };
        obj.attr(att);
        att = { x: obj.getBBox().x+padding };
        obj.pair.attr(att);
        d += obj.getBBox().width+(margin-2*padding);
      }
      for (i = connections.length; i--;) {
        r.connection(connections[i]);
      }
    },
    connections = [],
    margin = 30,
    padding = margin/3,
    xbegin = 5,
    ybegin = xbegin,
    box_height = 40,
    line_margin = 100,
    source = ["das", "ist ein", "kleines", "haus", "gewesen", "."], // data
    target = ["this", "has been", "a", "small", "house", "."],      // ^
    align  = [0, 1, 3, 4, 1, 5],                                    // ^
    make_objs = function (a, y, yd, type_=null)
    {
      for (var i=0; i < a.length; i++) {
        var x_text = 0,
            x_shape = 0;
        if (i == 0) {
          x_text = xbegin+padding;
          x_shape = xbegin;
        } else {
          x_text = margin+texts[texts.length-1].getBBox().x2;
          x_shape = shapes[shapes.length-1].getBBox().x2+padding;
        }
        texts.push(r.text(x_text, y+yd, a[i]).attr({'text-anchor': 'start', 'font-size': 14, 'font-family': 'Times New Roman'}));
        shapes.push(r.rect(x_shape, y, texts[texts.length-1].getBBox().width+(2*padding), box_height));
        texts[texts.length-1].toBack();
        shapes[shapes.length-1].toFront();
        if (type_) {
          texts[texts.length-1]["type_"] = type_;
          shapes[shapes.length-1]["type_"] = type_;
        }
      }
    };
  // source
  make_objs(source, ybegin, box_height/2);
  make_objs(target, line_margin+ybegin, box_height/2, "target");
  // text editing
  /*text = texts[4];
  r.inlineTextEditing(text);
  shape = shapes[4];
  shape.dblclick(function(){
    text.toFront();
    // Retrieve created <input type=text> field
    var input = text.inlineTextEditing.startEditing();

    input.addEventListener("blur", function(e){
        // Stop inline editing after blur on the text field
        text.inlineTextEditing.stopEditing();
        this.toFront();
    }, true);
  });*/
  // make draggable
  var k = 0;
  for (var i=0; i < shapes.length; i++) {
    shapes[i].attr({ fill: "#eee", stroke: "#000", "fill-opacity": 0, "stroke-width": 1 });
    texts[i].attr({fill: "#000", stroke: "none"});
    if (shapes[i]["type_"] == "target") {
      shapes[i].drag(move, dragger, up).onDragOver( function(obj) { collide(obj); })
      shapes[i].attr({ cursor: "move" });
      texts[i].drag(move, dragger, up);
      shapes[i]["id_"] = k;
      shapes[i]["grid_"] = k;
      shapes_by_id[k] = shapes[i];
      k++;
    }
    shapes[i].pair = texts[i];
    texts[i].pair = shapes[i];
  }
  // connections
  var offset = source.length-1;
  for (var i=0; i < align.length; i++) {
    connections.push(r.connection(shapes[i], shapes[offset+align[i]+1], "#000"));
  }
};


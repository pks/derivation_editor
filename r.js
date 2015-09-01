/*
 * global vars and data
 *
 */
var shapes_by_id = {},
    r,
    curDrag = null,
    curEd = null,
    curEdShape = null,
    shapes = [],
    target_shapes = [],
    texts = [],
    connections = {},
    margin = 30,
    padding = margin/3,
    xbegin = 80,
    ybegin = 5,
    box_height = 50,
    line_margin = 150,
    ysource = ybegin,
    ytarget = ysource+line_margin;
    font_size = 20,
    font_width = -1,
    id = 0,
    connect_mode = false,
    connect_mode_shape = null,
    edit_mode = false,
    rm_shape = null,
    text_att = { 'fill': '#000', 'stroke': 'none', 'text-anchor': 'start', 'font-size': font_size, 'font-family': 'Times New Roman' },
    shape_att = { fill: "#eee", stroke: "#000", "fill-opacity": 0, "stroke-width": 1 }
    source = ["Das", "ist ein", "kleines", "Haus", "gewesen", "."], // data
    target = ["This", "has been", "a", "small", "house", "."],      // ^
    align  = [0, 1, 3, 4, 1, 5];                                    // ^

/*
 * connection
 *
 */
Raphael.fn.connection = function (obj1, obj2, line, bg)
{
  if (obj1.line && obj1.from && obj1.to) {
    line = obj1;
    obj1 = line.from;
    obj2 = line.to;
  }
  if (!obj1.getBBox() || !obj2.getBBox())
    return;
  var bb1 = obj1.getBBox(),
      bb2 = obj2.getBBox(),
      x1 = bb1.x+bb1.width/2,
      y1 = bb1.y+bb1.height,
      x2 = bb2.x+bb2.width/2,
      y2 = bb2.y,
      path = ["M", x1, y1, "L", x2, y2];
  if (line && line.line) {
    line.bg && line.bg.attr({path: path});
    line.line.attr({path: path});
  } else {
    return {
      bg: bg && bg.split && this.path(path).attr({stroke: bg.split("|")[0], fill: "none", "stroke-width": bg.split("|")[1] || 3}),
      line: this.path(path).attr({stroke: "#000", fill: "none"}),
      from: obj1,
      to: obj2
    };
  }
};
var conn_str = function (obj1, obj2)
{
  return obj1["id_"]+"-"+obj2["id_"];
}
var make_conn = function(obj1, obj2)
{
  connections[conn_str(obj1,obj2)] = r.connection(obj1, obj2);
},
rm_conn = function(id1, id2)
{
  var b = false;
  for (var i=0; i<source.length; i++) {
    for (var j=0; j<target_shapes.length; j++) {
      if (i==id1 && target_shapes[j]["id_"]==id2) {
        var key = id1+"-"+id2;
        var q = connections[key];
        q.line.remove();
        delete connections[key];
        b = true;
        break;
      }
    }
    if (b)
      break;
  }
}
make_conns_from_a = function (align)
{
  var offset = source.length-1;
  for (var i=0; i < align.length; i++) {
    make_conn(shapes[i], shapes[offset+align[i]+1]);
  }
}

/*
 * drag'n drop
 *
 */
var dragger = function ()
{
  curDrag = this;
  if (this.type == "text")
    curDrag = this.pair;
  curDrag.toFront();
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
move = function (dx, dy)
{
  var att = { x: this.ox + dx, y: this.oy };
  this.attr(att);
  att = { x: this.pair.ox + dx, y: this.pair.oy };
  this.pair.attr(att);
  for (key in connections) {
    r.connection(connections[key]);
  }
  r.safari();
};

/*
 * snap-to-grid
 *
 */
var collide = function collide(obj)
{
  if (obj.type != 'rect') {
    return;
  }
  if (obj["rm_shape"]) {
    curDrag["delete_me_"] = true;
    return;
  }
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
  if (this["delete_me_"]) {
    var del = shapes_by_id[this["id_"]];
    for (key in connections) {
      if (key.split("-")[1] == curDrag["id_"]) {
        rm_conn(key.split("-")[0], key.split("-")[1]);
      }
    }
    var i=source.length;
    for (; i<shapes.length; i++) {
      if (shapes[i] == this) {
        break;
      }
    }
    shapes.splice(i, 1);
    for (var i=0; i<target_shapes.length; i++) {
      if (target_shapes[i] == this) {
        break;
      }
    }
    target_shapes.splice(i, 1);
    delete shapes_by_id[this["id_"]];
    del.pair.remove();
    del.remove();
    snap_to_grid(true);

    return;
  }
  if (this.type != "text")
    this.animate({"fill-opacity": 0}, 500);
  if (this.pair.type != "text")
    this.pair.animate({"fill-opacity": 0}, 500);

  snap_to_grid(true);
},
snap_to_grid = function (anim=false)
{
  // just x coord, y is fixed in drag
  var d = xbegin;
  var d2 = 0;
  // just target objs
  target_shapes.sort(function(a, b) {
    return a["grid_"]-b["grid_"];
  });
  for (var i = 0; i < target_shapes.length; i++) {
    var obj = target_shapes[i];
    if (!obj || !obj.attrs) { // removed
      return;
    }
    att = { x:d };
    if (anim) {
      obj.attr(att);
    } else {
      obj.attr(att);
    }
    att = { x: obj.getBBox().x+padding };
    if (anim) {
      obj.pair.animate(att,125);
    } else {
      obj.pair.attr(att);
    }
    d += obj.getBBox().width+(margin-2*padding);
  }
  for (key in connections) {
    r.connection(connections[key]);
  }
};

/*
 * objs
 *
 */
var make_obj = function(x, text, type)
{
  var y;
  if (type == "source") {
    y = ysource;
  } else if (type == "target") {
    y = ytarget;
  }
  // make text obj
  texts.push(r.text(x, y+(box_height/2), text).attr(text_att));
  // make shape obj
  var x_shape = texts[texts.length-1].getBBox().x-padding,
      x_width = texts[texts.length-1].getBBox().width+(2*padding);
  shapes.push(r.rect(x_shape, y, x_width, box_height, 5).attr(shape_att));
  tx = texts[texts.length-1];
  sh = shapes[shapes.length-1];
  // fix z-index
  tx.toBack();
  sh.toFront();
  // pair text/shape
  tx.pair = shapes[shapes.length-1];
  sh.pair = texts[texts.length-1];
  // meta
  sh["type_"] = type;
  sh["id_"] = id;
  shapes_by_id[id] = sh;
  if (type == "target") {
    sh.drag(move, dragger, up).onDragOver( function(obj) { collide(obj); })
    sh.attr({ cursor: "move" });
    tx.drag(move, dragger, up);
    sh["grid_"] = id;
    sh.click(function() {
      if (connect_mode) {
        if (connections[conn_str(connect_mode_shape,this)]) {
          rm_conn(connect_mode_shape["id_"], this["id_"]);
        } else {
          make_conn(connect_mode_shape, this);
        }
        connect_mode_shape.attr({"fill-opacity": 0});
        connect_mode = false;
        connect_mode_shape = null;
      }
    });
    target_shapes.push(sh);
    // inline text editing
    r.inlineTextEditing(tx);
    sh.dblclick(function(){
      if (edit_mode) return;
      edit_mode = true;
      this.pair.toFront();
      curEd = this.pair;
      curEdShape = this;
      var input = curEd.inlineTextEditing.startEditing();
      input.addEventListener("keypress", function(e) {
        if (e.keyCode == 13) { // return
          e.preventDefault();
          return;
        } else if (e.keyCode==27||e.keyCode==37||e.keyCode==38||e.keyCode==39||e.keyCode==40) { // esc, arrows, backspace
          return;
        } else if (e.keyCode == 8) { // backspace
          curEdShape.animate({width:curEdShape.getBBox().width-14},125);
          setTimeout(function(){snap_to_grid(true);},125);
        } else {
          curEdShape.animate({width:curEdShape.getBBox().width+font_width},125);
          setTimeout(function(){
            snap_to_grid(true);
            r.setSize(r.width+font_width, r.height);
          },125);
        }
      });
      input.addEventListener("blur", function(e) {
          curEd.inlineTextEditing.stopEditing();
          curEdShape.toFront();
          curEdShape.animate({width:curEd.getBBox().width+(margin-padding)},125);
          setTimeout(function(){snap_to_grid(true);},125);
          edit_mode = false;
      }, true);
    });
  } else if (type == "source") {
    sh.click(function() {
      if (connect_mode) {
        if (this != connect_mode_shape)
          return;
        this.animate({"fill-opacity": 0}, 250);
        connect_mode = false;
        connect_mode_shape = null;
      } else {
        this.animate({"fill-opacity": .5}, 250);
        connect_mode = true;
        connect_mode_shape = this;
      }
    });
  }
  id++;
},
add_obj = function()
{
  var max=0, max_idx=-1;
  for (var i=0; i < shapes.length; i++) {
    if (shapes[i]["grid_"] > max) {
      max_idx = i;
      max = shapes[i]["grid_"];
    }
  }
  if (!shapes[max_idx]) {
    make_obj(xbegin+padding, "NEW", "target", 0);
  } else {
    make_obj(shapes[max_idx].getBBox().x2+(margin-padding),
             "NEW",
             "target",
             max+1);
  }
  r.setSize(r.width+target_shapes[target_shapes.length-1].getBBox().width+margin, r.height);

  snap_to_grid(true);
},
make_objs = function (a, type)
{
  for (var i=0; i < a.length; i++) {
    var x = 0;
    if (i == 0) {
      x = xbegin+padding;
    } else {
      x = margin+texts[texts.length-1].getBBox().x2;
    }
    make_obj(x, a[i], type);
  }
};

/*
 * data
 *
 */
var extract_data = function ()
{
  el = document.getElementById("data");
  d = {};
  d["source"] = [];
  d["target"] = [];
  d["align"] = [];
  // target
  var ids = [];
  target_shapes.sort(function(a, b) {
    return a["grid_"]-b["grid_"];
  });
  for (var i=0; i<target_shapes.length; i++) {
    d["target"].push(target_shapes[i].pair.attr("text"));
    ids.push(target_shapes[i]["id_"]);
  }
  // alignment
  for (key in connections) {
    var a = key.split('-');
    var src = a[0], tgt = ids.indexOf(parseInt(a[1]));
    d["align"].push(src+'-'+tgt);
  }
  // source
  for (var i=0; i<shapes.length; i++) {
    if (shapes[i]["type_"] == "source") {
      d["source"].push(shapes[i].pair.attr("text"));
    } else {
      break;
    }
  }
  // output
  s = JSON.stringify(d);
  el.innerHTML = s;

  return s;
}


///////////////////////////////////////////////////////////////////////////////

window.onload = function ()
{
  // canvas
  r = Raphael("holder",0,0);
  var c = 0,
      d = 0,
      a = null;
  for (var i=0; i<source.length; i++) {
    c += source[i].length;
  }
  for (var i=0; i<target.length; i++) {
    d += target[i].length;
  }
  font_width = r.text(-100,-100,'m').getBBox().width;
  var paper_width  = xbegin+(Math.max(source.length,target.length)*(margin+padding))
                      +(Math.max(c,d)*font_width),
      paper_height = ybegin+2*box_height+line_margin;
  r.setSize(paper_width, paper_height);
  rm_shape = r.rect(5, line_margin+ybegin, 50, box_height).attr({"fill":"#fff","stroke":0}).animate({"fill":"red"}, 1000);
  rm_shape.toBack();
  rm_shape["rm_shape"] = true;
  // source objs
  make_objs(source, "source");
  // target objs
  make_objs(target, "target");
  // initial connections from alignment
  make_conns_from_a(align);
};


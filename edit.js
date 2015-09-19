/*
 * global vars and data
 *
 */
var r,
    // objects
    shapes_by_id  = {},
    shapes        = [],
    target_shapes = [],
    texts         = [],
    connections   = {},
    id            = 0,
    next_grid     = 0,
    // layout
    margin          = 30,
    padding         = margin/3,
    xbegin          = 80,
    ybegin          = 5,
    box_height      = 50,
    line_margin     = 150,
    ysource         = ybegin,
    ytarget         = ysource+line_margin;
    font_size       = 13,
    font_width      = -1,
    stroke_width    = 1,
    stroke_width_hi = 3,
    text_att  = { "fill": "#000", "stroke": "none", "text-anchor": "start",
                 "font-size": font_size, "font-family": "Times New Roman" },
    shape_att = { "fill": "#eee", "stroke": "#000", "fill-opacity": 0,
                  "stroke-width": stroke_width }
    // dragging
    cur_drag = null,
    new_pos = -1,
    old_pos = -1;
    // connecting
    connect_mode       = false,
    connect_mode_shape = null,
    // editing
    cur_ed      = null,
    cur_ed_shape = null,
    edit_mode = false,
    // removing
    rm_shape = null,
    // data
    source = ["Das", "ist ein", "kleines", "Haus", "gewesen", "."],
    target = ["This", "has been", "a", "small", "house", "."],
    align  = [0, 1, 3, 4, 1, 5],
    data = null;

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
  shapes_by_id[id1].attr({"stroke-width":stroke_width});
}
make_conns_from_a = function (align)
{
  var offset = source.length;
  for (var i=0; i < align.length; i++) {
    for (var j=0; j<align[i].length; j++) {
      make_conn(shapes[i], shapes[offset+align[i][j]]);
    }
  }
}

/*
 * drag"n drop
 *
 */
var dragger = function ()
{
  if (edit_mode)
    return;
  cur_drag = this;
  // drag shape, not text
  if (this.type == "text")
    cur_drag = this.pair;
  cur_drag.toFront();
  // remember grid pos
  old_pos = cur_drag["grid_"];
  new_pos = cur_drag["grid_"];
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
  if (edit_mode) return;
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
var collide = function collide (obj)
{
  // not a shape
  if (!obj["id_"] || obj.type!="rect")
    return;
  // remove
  if (obj["rm_shape_"]) {
    cur_drag["delete_me_"] = true;
    return;
  }
  if (cur_drag["grid_tmp_"] > obj["grid_tmp_"]) {
  // right -> left
    if (cur_drag.getBBox().width < obj.getBBox().width &&
        cur_drag.getBBox().x > (obj.getBBox().x+obj.getBBox().width/1000)) { // ignored tolerance, when
      return;                                                                // dragging onto shapes
    }
    att = { x: obj.attr("x")+cur_drag.getBBox().width+(margin-2*padding) };
    obj.attr(att);
    att = { x: obj.pair.attr("x")+cur_drag.getBBox().width+(margin-2*padding) };
    obj.pair.attr(att);
  } else {
  // left -> right
    if (cur_drag.getBBox().width < obj.getBBox().width &&
        cur_drag.getBBox().x < (obj.getBBox().x+obj.getBBox().width/1000)) {
      return;
    }
    att = { x: obj.attr("x")-(cur_drag.getBBox().width+(margin-2*padding)) };
    obj.attr(att);
    att = { x: obj.pair.attr("x")-(cur_drag.getBBox().width+(margin-2*padding)) };
    obj.pair.attr(att);
  }
  // grid pos
  new_pos = obj["grid_tmp_"];
  var tmp_pos = cur_drag["grid_tmp_"];
  cur_drag["grid_tmp_"] = obj["grid_tmp_"];
  obj["grid_tmp_"] = tmp_pos;
},
debug = function () {
  var s = "";
  for (var i=0; i<target_shapes.length; i++) {
    s+= target_shapes[i]["id_"] + "@" + target_shapes[i]["grid_"]+" " ;
  }
  document.getElementById("debug").innerHTML = s;
  document.getElementById("debug").innerHTML += " new:"+new_pos + " old:"+old_pos;
  document.getElementById("debug").innerHTML += " next_grid:"+next_grid;
},
up = function () {
  if (this["delete_me_"]) {
    var del = shapes_by_id[this["id_"]];
    if (!del)
      return;
    var del_grid = del["grid_"]
    for (key in connections) {
      if (key.split("-")[1] == cur_drag["id_"]) {
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
    var x = del.pair;
    if (x)
      x.remove();
    if (del)
      del.remove();
    var max = -1;
    for (var i=0; i<target_shapes.length; i++) {
      var g = target_shapes[i]["grid_"];
      if (g > del_grid) {
        target_shapes[i]["grid_"] -= 1;
      }
      if (g > max)
        max = g;
    }
    next_grid = g;
    if (!next_grid) // empty
      next_grid = 0;
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
  // just target objs
  target_shapes.sort(function(a, b) {
    return a["grid_"]-b["grid_"];
  });
  // switch
  if (cur_drag) { // fix glitch when calling from add_obj
  cur_drag["grid_"] = new_pos;
  cur_id = cur_drag["id_"];
  if (new_pos > old_pos) {
  // left -> right
    for (var i=0; i < target_shapes.length; i++) {
      pos = target_shapes[i]["grid_"];
      id_ = target_shapes[i]["id_"];
      if (id_ == cur_id)
        continue;
      if (pos >= old_pos && pos <= new_pos) {
        target_shapes[i]["grid_"] -= 1;
      } else {
        continue;
      }
    }
  } else if (new_pos < old_pos) {
  // right -> left
    for (var i=0; i < target_shapes.length; i++) {
      pos = target_shapes[i]["grid_"];
      id_ = target_shapes[i]["id_"];
      if (id_ == cur_id)
        continue;
      if (pos >= new_pos && pos <= old_pos) {
        target_shapes[i]["grid_"] += 1;
      } else {
        continue;
      }
    }
  }
  } // ^ fix glitch
  // sort by grid pos
  target_shapes.sort(function(a, b) {
    return a["grid_"]-b["grid_"];
  });
  // fix box layout
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
    // fix tmp grid
    obj["grid_tmp_"] = obj["grid_"];
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
    sh["grid_"] = next_grid;
    sh["grid_tmp_"] = next_grid;
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
      cur_ed = this.pair;
      cur_ed_shape = this;
      var input = cur_ed.inlineTextEditing.startEditing();
      input.addEventListener("keypress", function(e) {
        if (e.keyCode==27||e.keyCode==37||e.keyCode==38||e.keyCode==39||e.keyCode==40) {
        // esc, arrows, backspace
          return;
        } else if (e.keyCode == 8) {
        // backspace
          cur_ed_shape.animate({width:cur_ed_shape.getBBox().width-font_width},125);
          setTimeout(function(){snap_to_grid(true);},125);
        } else if (e.keyCode == 13) {
        // return
          e.preventDefault();
          cur_ed.inlineTextEditing.stopEditing();
          cur_ed_shape.toFront();
          cur_ed.toBack();
          cur_ed_shape.animate({width:cur_ed.getBBox().width+(margin-padding)},125);
          setTimeout(function(){snap_to_grid(true);},125);
          edit_mode = false;
        } else {
        // input
          cur_ed_shape.animate({width:(this.value.length*font_width)+2*font_width+2*padding},25);
          setTimeout(function(){
            snap_to_grid(true);
            r.setSize(r.width+font_width, r.height);
          },25);
        }
      });
      input.addEventListener("blur", function(e) {
          cur_ed.inlineTextEditing.stopEditing();
          cur_ed_shape.toFront();
          cur_ed.toBack();
          cur_ed_shape.animate({width:cur_ed.getBBox().width+(margin-padding)},125);
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
  // mouseover -out
  sh.mouseover(function() {
    var idx, other_idx;
    if (this["type_"] == "target") {
      idx = 1;
      other_idx = 0;
    } else {
      idx = 0;
      other_idx = 1;
    }
    for (c in connections) {
      if (parseInt(c.split("-")[idx]) == this["id_"]) {
        connections[c].line.attr({"stroke-width":stroke_width_hi});
        shapes_by_id[parseInt(c.split("-")[other_idx])].attr({"stroke-width":stroke_width_hi});
      }
    }
    this.animate({"stroke-width":stroke_width_hi})
  });
  sh.mouseout(function() {
    var idx, other_idx;
    if (this["type_"] == "target") {
      idx = 1;
      other_idx = 0;
    } else {
      idx = 0;
      other_idx = 1;
    }
    for (c in connections) {
      if (parseInt(c.split("-")[idx]) == this["id_"]) {
        connections[c].line.attr({"stroke-width":stroke_width});
        shapes_by_id[parseInt(c.split("-")[other_idx])].attr({"stroke-width":stroke_width});
      }
    }
    this.animate({"stroke-width":stroke_width})
  });
  id++;
  if (type == "target")
    next_grid++;
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
    make_obj(xbegin+padding, "X", "target");
  } else {
    make_obj(shapes[max_idx].getBBox().x2+(margin-padding),
             "X",
             "target");
  }
  r.setSize(r.width+target_shapes[target_shapes.length-1].getBBox().width+margin, r.height);

  cur_drag = null;
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
    var a = key.split("-");
    var src = a[0], tgt = ids.indexOf(parseInt(a[1]));
    d["align"].push(src+"-"+tgt);
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

function loadJSON(callback) {
  /*var xobj = new XMLHttpRequest();
      xobj.overrideMimeType("application/json");
  xobj.open('GET', 'http://simianer.de/tmp/example.json', true);
  xobj.onreadystatechange = function () {
    if (xobj.readyState == 4 && xobj.status == "200") {
      callback(xobj.responseText);
    }
  };
  xobj.send(null);*/
}

function load_data()
{
  //loadJSON(function(r) {
    //data=JSON.parse(r);
    data=JSON.parse('{"phrase_alignment":[[0,2],[1],[0,2],[3],[4],[5],[6],[7,9],[8],[7,9],[10,18],[11],[10,18],[12],[13],[14],[15],[16],[17],[10,18],[19],[20],[21,23],[22],[21,23],[24],[25]],"source_groups":["hier also","ein bescheidener",",","auf alle","demokratien","anzuwendender","vorschlag",":","der markt für","ideen","funktioniert","besser",",","wenn es den","bürgern","leichter","fällt , die","zielkonflikte zwischen","treffsicherheit","der","aussagen und","unterhaltung","oder zwischen","treffsicherheit","und","parteitreue","zu erkennen ."],"target_groups":["so here","a modest",",","to all","democracies","anzuwendender","proposal",":","the market for","ideas","works","better","if","citizens","easier",", the","trade @-@ offs between","treffsicherheit","the","statements and","entertainment","or","treffsicherheit","and","parteitreue","."]}');
    source = data["source_groups"];
    target = data["target_groups"];
    align  = data["phrase_alignment"];
    init();
  //});
}

var init = function ()
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
  font_width = r.text(-100,-100,"m").getBBox().width;
  var paper_width  = xbegin+(Math.max(source.length,target.length)*(margin+padding))
                      +(Math.max(c,d)*font_width),
      paper_height = ybegin+2*box_height+line_margin;
  r.setSize(paper_width, paper_height);
  rm_shape = r.rect(5, line_margin+ybegin, 50, box_height).attr({"fill":"#fff","stroke":0}).animate({"fill":"red"}, 2000);
  rm_shape.toBack();
  rm_shape["rm_shape_"] = true;
  rm_shape["id_"]       = -1;
  // source objs
  make_objs(source, "source");
  // target objs
  make_objs(target, "target");
  // initial connections from alignment
  make_conns_from_a(align);
},
reset = function()
{
  shapes_by_id  = {};
  shapes        = [];
  target_shapes = [];
  texts         = [];
  connections   = {};
  id            = 0;
  next_grid     = 0;
  cur_drag = null;
  edit_mode    = false;
  cur_ed       = null;
  cur_ed_shape = null;
  connect_mode       = false;
  connect_mode_shape = null;
  rm_shape = null;

  document.getElementById("holder").parentElement.removeChild(document.getElementById("holder"));
  var new_holder = document.createElement("div");
  new_holder.setAttribute("id","holder");
  document.getElementById("wrapper").appendChild(new_holder);

  init();
};

window.onload = function ()
{
  load_data();
};


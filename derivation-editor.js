/*
 * global vars and configuration
 *
 */
var DE_paper,
    // objects
    DE_shapes_by_id  = {},
    DE_shapes        = [],
    DE_target_shapes = [],
    DE_texts         = [],
    DE_connections   = {},
    DE_id            = 0,
    DE_next_grid     = 0,
    // ui
    DE_ui_margin          = 32,
    DE_ui_padding         = DE_ui_margin/3,
    DE_ui_xbegin          = 5,
    DE_ui_ybegin          = 5,
    DE_ui_box_height      = 32,
    DE_ui_line_margin     = 64,
    DE_ui_ysource         = DE_ui_ybegin,
    DE_ui_ytarget         = DE_ui_ysource+DE_ui_line_margin;
    DE_ui_font_size       = 14,
    DE_ui_font_width      = -1,
    DE_ui_stroke_width    = 1,
    DE_ui_stroke_width_hi = 3,
    DE_ui_align_stroke    = "#ccc",
    DE_ui_align_stroke_hi = "#000",
    DE_ui_fill_opacity_hi = { "fill-opacity": .2 },
    DE_ui_text_att  = { "fill": "#000", "stroke": "none",
                        "text-anchor": "start", "font-size": DE_ui_font_size,
                        "font-family": "Times New Roman" },
    DE_ui_shape_att = { "fill": "red", "stroke": "#000", "fill-opacity": 0,
                        "stroke-width": DE_ui_stroke_width }
    // dragging
    DE_cur_drag = null,
    DE_dragging = false,
    DE_new_pos  = -1,
    DE_old_pos  = -1;
    // connecting
    DE_connect_mode       = false,
    DE_connect_mode_shape = null,
    DE_new_conns          = [],
    // editing
    DE_cur_ed       = null,
    DE_cur_ed_shape = null,
    DE_edit_mode    = false,
    // removing
    DE_rm_mult  = [],
    // data
    DE_data_source = null,
    DE_data_target = null,
    DE_data_align  = null;

/******************************************************************************
 *
 * connections/links
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
      line: this.path(path).attr({stroke: DE_ui_align_stroke, fill: "none"}),
      from: obj1,
      to: obj2
    };
  }
}

var DE_conn_str = function (obj1, obj2)
{
  return obj1["id_"]+"-"+obj2["id_"];
}

var DE_make_conn = function(obj1, obj2)
{
  DE_connections[DE_conn_str(obj1,obj2)] = DE_paper.connection(obj1, obj2);
  if (DE_connect_mode) {
    DE_new_conns.push(DE_connections[DE_conn_str(obj1,obj2)]);
    DE_connections[DE_conn_str(obj1,obj2)].line.attr({"stroke":DE_ui_align_stroke_hi,"stroke-width":DE_ui_stroke_width_hi});
  }
}

var DE_rm_conn = function (id1, id2)
{
  var b = false;
  for (var i=0; i<DE_data_source.length; i++) {
    for (var j=0; j<DE_target_shapes.length; j++) {
      if (i==id1 && DE_target_shapes[j]["id_"]==id2) {
        var key = id1+"-"+id2;
        var q = DE_connections[key];
        q.line.remove();
        delete DE_connections[key];
        b = true;
        break;
      }
    }
    if (b)
      break;
  }
  DE_shapes_by_id[id1].attr({"stroke-width":DE_ui_stroke_width});
}

var DE_make_conns_from_a = function (align)
{
  var offset = DE_data_source.length;
  for (var i=0; i < align.length; i++) {
    for (var j=0; j<align[i].length; j++) {
      DE_make_conn(DE_shapes[i], DE_shapes[offset+align[i][j]]);
    }
  }
}

/******************************************************************************
 *
 * drag"n drop
 *
 */
var DE_dragger = function ()
{
  if (DE_edit_mode)
    return;
  DE_cur_drag = this;
  DE_dragging = true;
  // drag shape, not text
  if (this.type == "text")
    DE_cur_drag = this.pair;
  DE_cur_drag.toFront();
  // remember grid pos
  DE_old_pos = DE_cur_drag["grid_"];
  DE_new_pos = DE_cur_drag["grid_"];
  // remember original coords
  this.ox = this.attr("x");
  this.oy = this.attr("y");
  this.pair.ox = this.pair.attr("x");
  this.pair.oy = this.pair.attr("y");
  if (this.type != "text")
    this.animate(DE_ui_fill_opacity_hi, 250);
  if (this.pair.type != "text")
    this.pair.animate(DE_ui_fill_opacity_hi, 250);
}

var DE_move = function (dx, dy)
{
  if (DE_edit_mode) return;
  var att = { x: this.ox + dx, y: this.oy };
  this.attr(att);
  att = { x: this.pair.ox + dx, y: this.pair.oy };
  this.pair.attr(att);
  for (key in DE_connections) {
    DE_paper.connection(DE_connections[key]);
  }

  DE_paper.safari();
}

var DE_up = function () {
  DE_dragging = false;
  if (this.type != "text")
    this.animate({"fill-opacity": 0}, 250);
  if (this.pair.type != "text")
    this.pair.animate({"fill-opacity": 0}, 250);

  snap_to_grid(true);
}

/******************************************************************************
 *
 * snap-to-grid
 *
 */
var DE_collide = function (obj)
{
  if (DE_edit_mode) return;
  if (obj["type_"]=="source") return;
  // not a shape
  if (!obj["id_"] || obj.type!="rect")
    return;
  if (DE_cur_drag["grid_tmp_"] > obj["grid_tmp_"]) {
  // right -> left
    if (DE_cur_drag.getBBox().width < obj.getBBox().width &&
        DE_cur_drag.getBBox().x > (obj.getBBox().x+obj.getBBox().width/1000)) { // ignored tolerance, when
      return;                                                                // dragging onto shapes
    }
    att = { x: obj.attr("x")+DE_cur_drag.getBBox().width+(DE_ui_margin-2*DE_ui_padding) };
    obj.attr(att);
    att = { x: obj.pair.attr("x")+DE_cur_drag.getBBox().width+(DE_ui_margin-2*DE_ui_padding) };
    obj.pair.attr(att);
  } else {
  // left -> right
    if (DE_cur_drag.getBBox().width < obj.getBBox().width &&
        DE_cur_drag.getBBox().x < (obj.getBBox().x+obj.getBBox().width/1000)) {
      return;
    }
    att = { x: obj.attr("x")-(DE_cur_drag.getBBox().width+(DE_ui_margin-2*DE_ui_padding)) };
    obj.attr(att);
    att = { x: obj.pair.attr("x")-(DE_cur_drag.getBBox().width+(DE_ui_margin-2*DE_ui_padding)) };
    obj.pair.attr(att);
  }
  // grid pos
  DE_new_pos = obj["grid_tmp_"];
  var tmp_pos = DE_cur_drag["grid_tmp_"];
  DE_cur_drag["grid_tmp_"] = obj["grid_tmp_"];
  obj["grid_tmp_"] = tmp_pos;
}

var snap_to_grid = function (anim=false)
{
  // just x coord, y is fixed in drag
  var d = DE_ui_xbegin;
  // just target objs
  DE_target_shapes.sort(function(a, b) {
    return a["grid_"]-b["grid_"];
  });
  // switch
  if (DE_cur_drag) { // fix glitch when calling from DE_add_object() and up()
    DE_cur_drag["grid_"] = DE_new_pos;
    cur_id = DE_cur_drag["id_"];
    if (DE_new_pos > DE_old_pos) {
    // left -> right
      for (var i=0; i < DE_target_shapes.length; i++) {
        pos = DE_target_shapes[i]["grid_"];
        id_ = DE_target_shapes[i]["id_"];
        if (id_ == cur_id)
          continue;
        if (pos >= DE_old_pos && pos <= DE_new_pos) {
          DE_target_shapes[i]["grid_"] -= 1;
        } else {
          continue;
        }
      }
    } else if (DE_new_pos < DE_old_pos) {
    // right -> left
      for (var i=0; i < DE_target_shapes.length; i++) {
        pos = DE_target_shapes[i]["grid_"];
        id_ = DE_target_shapes[i]["id_"];
        if (id_ == cur_id)
          continue;
        if (pos >= DE_new_pos && pos <= DE_old_pos) {
          DE_target_shapes[i]["grid_"] += 1;
        } else {
          continue;
        }
      }
    }
  } // ^ fix glitch
  // sort by grid pos
  DE_target_shapes.sort(function(a, b) {
    return a["grid_"]-b["grid_"];
  });
  // fix box layout
  for (var i = 0; i < DE_target_shapes.length; i++) {
    var obj = DE_target_shapes[i];
    if (!obj || !obj.attrs) { // removed
      return;
    }
    att = { x:d };
    if (anim) {
      obj.attr(att);
    } else {
      obj.attr(att);
    }
    att = { x: obj.getBBox().x+DE_ui_padding };
    if (anim) {
      obj.pair.animate(att,125);
    } else {
      obj.pair.attr(att);
    }
    d += obj.getBBox().width+(DE_ui_margin-2*DE_ui_padding);
    // fix tmp grid
    obj["grid_tmp_"] = obj["grid_"];
  }
  for (key in DE_connections) {
    DE_paper.connection(DE_connections[key]);
  }

  // now mouseout() can remove highligting
  DE_cur_drag = null;
}

var DE_debug_snap_to_grid = function () {
  var s = "";
  for (var i=0; i<DE_target_shapes.length; i++) {
    s+= DE_target_shapes[i]["id_"] + "@" + DE_target_shapes[i]["grid_"]+" " ;
  }
  document.getElementById("debug").innerHTML = s;
  document.getElementById("debug").innerHTML += " new:"+DE_new_pos + " old:"+DE_old_pos;
  document.getElementById("debug").innerHTML += " DE_next_grid:"+DE_next_grid;
}

/******************************************************************************
 *
 * add/remove objects
 *
 */
var DE_make_obj = function (x, text, type)
{
  var y;
  if (type == "source") {
    y = DE_ui_ysource;
  } else if (type == "target") {
    y = DE_ui_ytarget;
  }
  // make text obj
  DE_texts.push(DE_paper.text(x, y+(DE_ui_box_height/2), text).attr(DE_ui_text_att));
  // make shape obj
  var x_shape = DE_texts[DE_texts.length-1].getBBox().x-DE_ui_padding,
      x_width = DE_texts[DE_texts.length-1].getBBox().width+(2*DE_ui_padding);
  DE_shapes.push(DE_paper.rect(x_shape, y, x_width, DE_ui_box_height, 5).attr(DE_ui_shape_att));
  tx = DE_texts[DE_texts.length-1];
  sh = DE_shapes[DE_shapes.length-1];
  // fix z-index
  tx.toBack();
  sh.toFront();
  // pair text/shape
  tx.pair = DE_shapes[DE_shapes.length-1];
  sh.pair = DE_texts[DE_texts.length-1];
  // meta
  sh["type_"] = type;
  sh["id_"] = DE_id;
  DE_shapes_by_id[DE_id] = sh;
  if (type == "target") {
    sh.drag(DE_move, DE_dragger, DE_up).onDragOver(function(obj) { DE_collide(obj); })
    sh.attr({ cursor: "move" });
    tx.drag(DE_move, DE_dragger, DE_up);
    sh["grid_"] = DE_next_grid;
    sh["grid_tmp_"] = DE_next_grid;
    sh.click(function(e) {
      if (DE_connect_mode) {
        if (DE_connections[DE_conn_str(DE_connect_mode_shape,this)]) {
          DE_rm_conn(DE_connect_mode_shape["id_"], this["id_"]);
        } else {
          DE_make_conn(DE_connect_mode_shape, this);
          DE_connect_mode_shape.attr({"stroke":DE_ui_align_stroke_hi,"stroke-width":DE_ui_stroke_width_hi});
        }
        DE_connect_mode_shape.attr({"fill-opacity": 0});
        DE_connect_mode = false;
        DE_connect_mode_shape = null;
      } else { // delete
        if (e.shiftKey) {
          var index = DE_rm_mult.indexOf(this);
          if (index != -1) {
            DE_rm_mult.splice(index, 1);
            this.animate({"stroke":"#000"});
            this.animate({"fill-opacity":0});
          } else {
            this.animate({"stroke":"red"});
            DE_rm_mult.push(this);
          }
        }
      }
    });
    DE_target_shapes.push(sh);
    // inline text editing
    DE_paper.inlineTextEditing(tx);
    sh.dblclick(function(){
      if (DE_edit_mode) return;
      DE_edit_mode = true;
      this.pair.toFront();
      DE_cur_ed = this.pair;
      DE_cur_ed_shape = this;
      var input = DE_cur_ed.inlineTextEditing.startEditing();
      input.addEventListener("keypress", function(e) {
        if (e.keyCode==27||e.keyCode==37||e.keyCode==38||e.keyCode==39||e.keyCode==40) {
        // esc, arrows, backspace
          return;
        } else if (e.keyCode == 8) {
        // backspace
          DE_cur_ed_shape.animate({width:DE_cur_ed_shape.getBBox().width-DE_ui_font_width},125);
          setTimeout(function(){snap_to_grid(true);},125);
        } else if (e.keyCode == 13) {
        // return
          e.preventDefault();
          DE_cur_ed.inlineTextEditing.stopEditing();
          DE_cur_ed_shape.toFront();
          DE_cur_ed.toBack();
          DE_cur_ed_shape.animate({width:DE_cur_ed.getBBox().width+(DE_ui_margin-DE_ui_padding)},125);
          setTimeout(function(){snap_to_grid(true);},125);
          DE_edit_mode = false;
        } else {
        // input
          DE_cur_ed_shape.animate({width:(this.value.length*DE_ui_font_width)+2*DE_ui_font_width+2*DE_ui_padding},25);
          setTimeout(function(){
            snap_to_grid(true);
            DE_paper.setSize(DE_paper.width+DE_ui_font_width, DE_paper.height);
          },25);
        }
      });
      input.addEventListener("blur", function(e) {
          DE_cur_ed.inlineTextEditing.stopEditing();
          DE_cur_ed_shape.toFront();
          DE_cur_ed.toBack();
          DE_cur_ed_shape.animate({width:DE_cur_ed.getBBox().width+(DE_ui_margin-DE_ui_padding)},125);
          setTimeout(function(){snap_to_grid(true);},125);
          DE_edit_mode = false;
      }, true);
    });
  } else if (type == "source") {
    sh.click(function() {
      if (DE_connect_mode) {
        if (this != DE_connect_mode_shape)
          return;
        this.animate({"fill-opacity": 0}, 250);
        DE_connect_mode = false;
        DE_connect_mode_shape = null;
      } else {
        this.animate(DE_ui_fill_opacity_hi, 250);
        DE_connect_mode = true;
        DE_connect_mode_shape = this;
      }
    });
  }
  // mouseover -out
  sh.mouseover(function() {
    if (DE_dragging) return;
    if (DE_edit_mode) return;
    var idx, other_idx;
    if (this["type_"] == "target") {
      idx = 1;
      other_idx = 0;
    } else {
      idx = 0;
      other_idx = 1;
    }
    for (c in DE_connections) {
      if (parseInt(c.split("-")[idx]) == this["id_"]) {
        DE_connections[c].line.attr({"stroke":DE_ui_align_stroke_hi,"stroke-width":DE_ui_stroke_width_hi});
        DE_shapes_by_id[parseInt(c.split("-")[other_idx])].attr({"stroke-width":DE_ui_stroke_width_hi});
      }
    }
    this.animate({"stroke-width":DE_ui_stroke_width_hi})
  });
  sh.mouseout(function() {
    if (DE_cur_drag) return;
    if (DE_edit_mode) return; // FIXME
    var idx, other_idx;
    if (this["type_"] == "target") {
      idx = 1;
      other_idx = 0;
    } else {
      idx = 0;
      other_idx = 1;
    }
    for (c in DE_connections) {
      if (parseInt(c.split("-")[idx]) == this["id_"]) {
        DE_connections[c].line.attr({"stroke":DE_ui_align_stroke,"stroke-width":DE_ui_stroke_width});
        DE_shapes_by_id[parseInt(c.split("-")[other_idx])].attr({"stroke-width":DE_ui_stroke_width});
      }
    }
    this.animate({"stroke-width":DE_ui_stroke_width})
    for (var i=0; i<DE_new_conns.length; i++) {
      DE_new_conns[i].line.attr({"stroke":DE_ui_align_stroke,"stroke-width":DE_ui_stroke_width});
    }
    DE_new_conns = [];
  });
  DE_id++;
  if (type == "target")
    DE_next_grid++;
}

var DE_add_object = function()
{
  if (!data) return;
  var max=0, max_idx=-1;
  for (var i=0; i < DE_shapes.length; i++) {
    if (DE_shapes[i]["grid_"] > max) {
      max_idx = i;
      max = DE_shapes[i]["grid_"];
    }
  }
  if (!DE_shapes[max_idx]) {
    DE_make_obj(DE_ui_xbegin+DE_ui_padding, "X", "target");
  } else {
    DE_make_obj(DE_shapes[max_idx].getBBox().x2+(DE_ui_margin-DE_ui_padding),
             "X",
             "target");
  }
  DE_paper.setSize(DE_paper.width+DE_target_shapes[DE_target_shapes.length-1].getBBox().width+DE_ui_margin, DE_paper.height);

  DE_cur_drag = null;
  snap_to_grid(true);
}

var DE_make_objs = function (a, type)
{
  for (var i=0; i < a.length; i++) {
    var x = 0;
    if (i == 0) {
      x = DE_ui_xbegin+DE_ui_padding;
    } else {
      x = DE_ui_margin+DE_texts[DE_texts.length-1].getBBox().x2;
    }
    DE_make_obj(x, a[i], type);
  }
};

var rm_obj = function(obj)
{
  var del = DE_shapes_by_id[obj["id_"]];
  if (!del)
    return;
  var del_grid = del["grid_"]
  for (key in DE_connections) {
    if (key.split("-")[1] == obj["id_"]) {
      DE_rm_conn(key.split("-")[0], key.split("-")[1]);
    }
  }
  var i=DE_data_source.length;
  for (; i<DE_shapes.length; i++) {
    if (DE_shapes[i] == obj) {
      break;
    }
  }
  DE_shapes.splice(i, 1);
  for (var i=0; i<DE_target_shapes.length; i++) {
    if (DE_target_shapes[i] == obj) {
      break;
    }
  }
  DE_target_shapes.splice(i, 1);
  delete DE_shapes_by_id[obj["id_"]];
  var x = del.pair;
  if (x)
    x.remove();
  if (del)
    del.remove();
  var max = -1;
  for (var i=0; i<DE_target_shapes.length; i++) {
    var g = DE_target_shapes[i]["grid_"];
    if (g > del_grid) {
      DE_target_shapes[i]["grid_"] -= 1;
    }
    if (g > max)
      max = g;
  }
  DE_next_grid = g;
  if (!DE_next_grid) // empty
    DE_next_grid = 0;
  DE_cur_drag = null;
  snap_to_grid(true);
  return;
}

$(document).keypress(function(e){
  if (DE_rm_mult.length>0 && e.which==0) {
    for (var i=0; i<DE_rm_mult.length; i++) {
      rm_obj(DE_rm_mult[i]);
    }
    DE_rm_mult = [];
  }
});

/******************************************************************************
 *
 * extract data from ui
 *
 */
var DE_extract_data = function ()
{
  el = document.getElementById("data");
  d = {};
  d["source"] = [];
  d["target"] = [];
  d["align"] = [];
  // target
  var ids = [];
  DE_target_shapes.sort(function(a, b) {
    return a["grid_"]-b["grid_"];
  });
  for (var i=0; i<DE_target_shapes.length; i++) {
    d["target"].push(DE_target_shapes[i].pair.attr("text"));
    ids.push(DE_target_shapes[i]["id_"]);
  }
  // alignment
  for (key in DE_connections) {
    var a = key.split("-");
    var src = a[0], tgt = ids.indexOf(parseInt(a[1]));
    d["align"].push(src+"-"+tgt);
  }
  // source
  for (var i=0; i<DE_shapes.length; i++) {
    if (DE_shapes[i]["type_"] == "source") {
      d["source"].push(DE_shapes[i].pair.attr("text"));
    } else {
      break;
    }
  }
  // output
  s = JSON.stringify(d);
  el.innerHTML = s;

  return s;
}

/******************************************************************************
 *
 * reset/init
 *
 */
var DE_reset = function()
{
  if (!data) return;
  if (DE_paper) {
    for (var x in DE_shapes_by_id) {
      if (x.remove) {
        x.pair.remove();
        x.remove();
      }
    }
    for (var x in DE_connections) {
      if (x.line)
        x.line.remove()
    }
    DE_paper.remove();
  }

  DE_shapes_by_id       = {};
  DE_shapes             = [];
  DE_target_shapes      = [];
  DE_texts              = [];
  DE_connections        = {};
  DE_id                 = 0;
  DE_next_grid          = 0;
  DE_cur_drag           = null;
  DE_edit_mode          = false;
  DE_cur_ed             = null;
  DE_cur_ed_shape       = null;
  DE_connect_mode       = false;
  DE_connect_mode_shape = null;

  document.getElementById("holder").parentElement.removeChild(
    document.getElementById("holder")
  );
  var new_holder = document.createElement("div");
  new_holder.setAttribute("id","holder");
  $("#derivation_editor").prepend(new_holder);
}

var DE_init = function ()
{
  if (!data) return;
  DE_reset();

  DE_data_source = data["source_groups"];
  DE_data_target = data["target_groups"];
  DE_data_align  = data["phrase_alignment"];

  // canvas
  DE_paper = Raphael("holder", 0, 0);
  var c = 0,
      d = 0,
      a = null;
  for (var i=0; i<DE_data_source.length; i++) {
    c += DE_data_source[i].length;
  }
  for (var i=0; i<DE_data_target.length; i++) {
    d += DE_data_target[i].length;
  }
  DE_ui_font_width = DE_paper.text(-100,-100,"a").getBBox().width;
  var avg_box_len = (Math.max(c,d)/Math.max(DE_data_source.length,DE_data_target.length))*DE_ui_font_width;
  var paper_width  = DE_ui_xbegin+(Math.max(DE_data_source.length,DE_data_target.length)*(DE_ui_margin+DE_ui_padding+avg_box_len)),
      paper_height = DE_ui_ybegin+2*DE_ui_box_height+DE_ui_line_margin;
  DE_paper.setSize(paper_width, paper_height);
  // source objs
  DE_make_objs(DE_data_source, "source");
  // target objs
  DE_make_objs(DE_data_target, "target");
  // initial connections from alignment
  DE_make_conns_from_a(DE_data_align);
}


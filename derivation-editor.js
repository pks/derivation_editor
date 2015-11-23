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
    DE_ui_xbegin          = 10,
    DE_ui_ybegin          = 5,
    DE_ui_box_height      = 32,
    DE_ui_line_margin     = 64,
    DE_ui_ysource         = DE_ui_ybegin,
    DE_ui_ytarget         = DE_ui_ysource+DE_ui_line_margin;
    DE_ui_font_size       = 14,
    DE_ui_font_width      = -1,
///////////////////////////////////////////////////////////////////////////////
    DE_ui_stroke_width    = 1,
    DE_ui_stroke_width_hi = 4,
    DE_ui_align_stroke    = "#000",
    DE_ui_align_stroke_hi = "#000",
    DE_ui_text_att  = { "text-anchor": "start", "font-size": DE_ui_font_size,
                        "font-family": "Times New Roman" },
///////////////////////////////////////////////////////////////////////////////
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
    // keyboard interface
    DE_kbd_focused_phrase = null,
    DE_kbd_move_mode      = false,
    DE_kbd_select_mode    = false,
    // done
    DE_target_done = [],
    // data
    DE_data_source = null,
    DE_data_target = null,
    DE_data_align  = null,
    // lock
    DE_locked = false;


/******************************************************************************
 *
 * style
 *
 */
var ch_style = function (item, shape_att, text_att, anim=false, anim_dur=50)
{
  if (!anim) {
    item.attr(shape_att);
    if (item.pair)
      item.pair.attr(text_att);
  } else {
    item.animate(shape_att, anim_dur);
    item.pair.animate(text_att, anim_dur);
  }
}

var DE_ui_style_normal = function (item, type=null)
{
  if (!type)
    type = item["type_"];
  var to_delete = false;
  var color = stroke_color = "#000";
  var text_color = "#fff";
  if (DE_rm_mult.indexOf(item)>-1)
    color = stroke_color = "#f00";
  if (DE_target_done.indexOf(item)>-1) {
    color = "#fff";
    text_color = stroke_color= "#000";
  }
  var shape_att;
  var text_att;
  if (type == "source") {
    shape_att = {
      "fill":         "#fff",
      "fill-opacity": 1.0,
      "stroke":       "#000",
      "stroke-width": 1
    };
    text_att  = {
      "fill":         "#000",
      "fill-opacity": 1.0,
      "stroke":       "none",
      "stroke-width": 0
    };
  } else { // type == "target"
    shape_att = {
      "fill":         color,
      "fill-opacity": 1.0,
      "stroke":       stroke_color,
      "stroke-width": 1
    };
    text_att  = {
      "fill":         text_color,
      "fill-opacity": 1.0,
      "stroke":       text_color,
      "stroke-width": 0
    };
  }

  ch_style(item, shape_att, text_att);
}

var DE_ui_style_highlight = function (item, type=null)
{
  if (!type)
    type = item["type_"];
  var to_delete = false;
  var color = stroke_color = "#000";
  var stroke_width = 9;
  var text_color = "#fff";
  if (DE_rm_mult.indexOf(item)>-1)
    color = stroke_color = "#f00";
  if (DE_target_done.indexOf(item)>-1) {
    color = "#fff";
    text_color = stroke_color = "#000";
    stroke_width = 5;
  }
  var shape_att;
  var text_att;
  if (type == "source") {
    shape_att = {
      "fill":         "#fff",
      "fill-opacity": 1.0,
      "stroke":       "#000",
      "stroke-width": 3
    };
    text_att  = {
      "fill":         "#000",
      "fill-opacity": 1.0,
      "stroke":       "none",
      "stroke-width": 0
    };
  } else { // type == "target"
    shape_att = {
      "fill":         color,
      "fill-opacity": 1.0,
      "stroke":       stroke_color,
      "stroke-width": stroke_width
    };
    text_att  = {
      "fill":         text_color,
      "fill-opacity": 1.0,
      "stroke":       text_color,
      "stroke-width": 0
    };
  }

  ch_style(item, shape_att, text_att);
}

var DE_ui_style_mark = function (item, type=null)
{
  if (!type)
    type = item["type_"];
  var shape_att;
  var text_att;
  if (type == "source") {
    shape_att = {
      "fill":         "#ff0000",
      "fill-opacity": 0.25,
      "stroke":       "#000",
      "stroke-width": 3
    };
    text_att  = {
      "fill":         "#000",
      "fill-opacity": 1.0,
      "stroke":       "none",
      "stroke-width": 0
    };
  } else { // type == "target"
    shape_att = {
      "fill":         "#000",
      "fill-opacity": 1.0,
      "stroke":       "#000000",
      "stroke-width": 9
    };
    text_att  = {
      "fill":         "#fff",
      "fill-opacity": 1.0,
      "stroke":       "#fff",
      "stroke-width": 0
    };
  }

  ch_style(item, shape_att, text_att);
}

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
      bg: bg && bg.split && this.path(path).attr({
        "stroke": bg.split("|")[0],
        "fill": "none",
        "stroke-width": bg.split("|")[1] || 3
      }),
      line: this.path(path).attr({
        "stroke": DE_ui_align_stroke,
        "fill": "none"
      }),
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
    DE_connections[DE_conn_str(obj1,obj2)].line.attr({
      "stroke":DE_ui_align_stroke_hi,
      "stroke-width":DE_ui_stroke_width_hi
    });
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
  for (c in DE_connections) {
    a = c.split("-");
    if (id1 == parseInt(a[0]) && parseInt(a[1])==DE_kbd_focused_phrase["id_"])
      return;
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
 * drag'n drop
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

  DE_snap_to_grid(true);
}

/******************************************************************************
 *
 * snap-to-grid
 *
 */
var DE_colldetect = function (dir)
{
  DE_target_shapes.sort(function(a, b) {
    return a["grid_"]-b["grid_"];
  });
  for (var i=0; i<DE_target_shapes.length; i++) {
    var a = DE_target_shapes[i];
    var a_left = a.attr("x");
    var a_right = a.attr("x")+a.attr("width");
    if (a["id_"]==DE_cur_drag["id_"])
      continue;
    for (var j=0; j<DE_target_shapes.length; j++) {
      var b = DE_target_shapes[j];
      if (a["id_"]==b["id_"])
        continue;
      if (b["id_"]==DE_cur_drag["id_"])
        continue;
      var b_left = b.attr("x");
      var b_right = b.attr("x")+b.attr("width");
      if (!(a_left >= b_right || a_right <= b_left)) { // collision!
        if (a["grid_"] > b["grid_"]) { // a should be right of b
          a.attr({"x": a.attr("x")+(a_right-b_left)});
          a.pair.attr({"x": a.pair.attr("x")+(a_right-b_left)});
        } else {                       // a should be left of b
          b.attr({"x": a.attr("x")+(a_right-b_left)});
          b.pair.attr({"x": a.pair.attr("x")+(a_right-b_left)});
        }
      }
    }
  }
}

var DE_collide = function (obj)
{
  if (DE_edit_mode) return;
  if (obj["type_"]=="source") return;
  // not a shape
  if (!obj["id_"] || obj.type!="rect")
    return;
  if (DE_cur_drag["grid_tmp_"] > obj["grid_tmp_"]) { // right -> left
    /*if (DE_cur_drag.getBBox().width < obj.getBBox().width &&
        DE_cur_drag.getBBox().x > (obj.getBBox().x+obj.getBBox().width/1000)) { // ignored tolerance, when
      return;                                                                   // dragging onto shapes
    }*/
    att = { x: obj.attr("x")+DE_cur_drag.getBBox().width+(DE_ui_margin-2*DE_ui_padding) };
    obj.attr(att);
    att = { x: obj.pair.attr("x")+DE_cur_drag.getBBox().width+(DE_ui_margin-2*DE_ui_padding) };
    obj.pair.attr(att);
    DE_colldetect("rl");
  } else { // left -> right
    /*if (DE_cur_drag.getBBox().width < obj.getBBox().width &&
        DE_cur_drag.getBBox().x < (obj.getBBox().x+obj.getBBox().width/1000)) {
      return;
    }*/
    att = { x: obj.attr("x")-(DE_cur_drag.getBBox().width+(DE_ui_margin-2*DE_ui_padding)) };
    obj.attr(att);
    att = { x: obj.pair.attr("x")-(DE_cur_drag.getBBox().width+(DE_ui_margin-2*DE_ui_padding)) };
    obj.pair.attr(att);
    DE_colldetect("lr");
  }
  // grid pos
  DE_new_pos = obj["grid_tmp_"];
  var tmp_pos = DE_cur_drag["grid_tmp_"];
  DE_cur_drag["grid_tmp_"] = obj["grid_tmp_"];
  obj["grid_tmp_"] = tmp_pos;
}

var DE_snap_to_grid = function (anim=false, ignore_cur_drag=false)
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
    if (DE_new_pos > DE_old_pos) { // left -> right
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
    } else if (DE_new_pos < DE_old_pos) { // right -> left
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
    if (DE_cur_drag && ignore_cur_drag && obj["id_"]==DE_cur_drag["id_"])
      continue;
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
      //obj.pair.animate(att,50);
      obj.pair.attr(att);
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
  if (!ignore_cur_drag)
    DE_cur_drag = null;
}

var DE_debug_DE_snap_to_grid = function () {
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
 * mouseover-out / click events
 *
 */
DE_item_mouseover = function (item)
{
  if (DE_locked) return;
  if (DE_dragging) return;
  if (DE_edit_mode) return;

  // fix z-index
  //this.pair.toBack();
  //this.toFront();

  // reset others
  var not_reset = [];
  for (c in DE_connections) {
    if (DE_shapes_by_id[parseInt(c.split("-")[1])] != DE_kbd_focused_phrase ||
        c.split("-")[1] != DE_kbd_focused_phrase["id_"])
      DE_connections[c].line.attr({"stroke-width":DE_ui_stroke_width});
    if (c.split("-")[1] == DE_kbd_focused_phrase["id_"])
      not_reset.push(c.split("-")[0]);
  }
  for (sh in DE_shapes_by_id) {
    if (sh != DE_kbd_focused_phrase["id_"]
        && not_reset.indexOf(sh)==-1) {
      if (!(DE_connect_mode_shape && sh==DE_connect_mode_shape["id_"])) {
        DE_ui_style_normal(DE_shapes_by_id[sh]);
      }
    }
  }

  var idx, other_idx;
  if (item["type_"] == "target") {
    idx = 1;
    other_idx = 0;
  } else {
    idx = 0;
    other_idx = 1;
  }
  for (c in DE_connections) {
    if (parseInt(c.split("-")[idx]) == item["id_"]) {
      DE_connections[c].line.attr({"stroke-width":DE_ui_stroke_width_hi});
      if (DE_shapes_by_id[parseInt(c.split("-")[other_idx])] != DE_connect_mode_shape)
        DE_ui_style_highlight(DE_shapes_by_id[parseInt(c.split("-")[other_idx])]);
    }
  }

  if (item != DE_connect_mode_shape)
    DE_ui_style_highlight(item);
}

DE_item_mouseout = function (item)
{
  if (DE_cur_drag) return;
  if (DE_edit_mode) return; // FIXME
  if (item == DE_connect_mode_shape) return;
  if (item == DE_kbd_focused_phrase) return;

  // fix z-index
  //this.pair.toFront();
  //this.toBack();

  var idx, other_idx;
  if (item["type_"] == "target") {
    idx = 1;
    other_idx = 0;
  } else {
    idx = 0;
    other_idx = 1;
  }
  var aligned_with_focused = false;
  for (c in DE_connections) {
    if (parseInt(c.split("-")[idx]) == item["id_"]) {
      var obj = DE_shapes_by_id[parseInt(c.split("-")[other_idx])];
      if (parseInt(c.split("-")[1]) != DE_kbd_focused_phrase["id_"]) {
        var x = false;
        for (d in DE_connections) {
          if (d == c.split("-")[0]+'-'+DE_kbd_focused_phrase["id_"]) {
            x = true;
            break;
          }
        }
        if (!x) {
          if (!(DE_connect_mode_shape && obj["id_"]==DE_connect_mode_shape["id_"]))
            DE_ui_style_normal(obj);
        }
        DE_connections[c].line.attr({"stroke-width":DE_ui_stroke_width});
      } else {
        aligned_with_focused = true;
      }
    }
  }
  if (!aligned_with_focused)
      DE_ui_style_normal(item);
  for (var i=0; i<DE_new_conns.length; i++) {
    DE_new_conns[i].line.attr({"stroke-width":DE_ui_stroke_width});
  }
  DE_new_conns = [];
}

var DE_item_click_target = function (e, item)
{
  if (DE_locked) return;
  if (DE_connect_mode) {
    if (DE_connections[DE_conn_str(DE_connect_mode_shape,item)]) {
      DE_rm_conn(DE_connect_mode_shape["id_"], item["id_"]);
      DE_ui_style_normal(DE_connect_mode_shape);
    } else {
      DE_ui_style_highlight(DE_connect_mode_shape);
      DE_make_conn(DE_connect_mode_shape, item);
    }
    DE_connect_mode = false;
    DE_connect_mode_shape = null;
  } else { // delete
    if (e.altKey) {
      if (DE_target_done.indexOf(item)>-1) return;
      var index = DE_rm_mult.indexOf(item);
      if (index != -1) {
        DE_rm_mult.splice(index, 1);
        for (c in DE_connections) {
          var i = parseInt(c.split("-")[1]);
          if (i == item["id_"])
            DE_connections[c].line.attr({"stroke":"#000"});
        }
        DE_ui_style_highlight(item);
      } else {
        item.attr({"stroke":"red", "fill":"red"});
        for (c in DE_connections) {
          var i = parseInt(c.split("-")[1]);
          if (i == item["id_"])
            DE_connections[c].line.attr({"stroke":"#f00"});
        }
        DE_rm_mult.push(item);
      }
    } else if(e.shiftKey && false) { // add
      var x = DE_shapes_by_id[item["id_"]].attr("x")+DE_shapes_by_id[item["id_"]].attr("width")
              +2*DE_ui_padding;
      var new_obj = DE_make_obj(x, "", "target");
      var new_grid = item["grid_"]+1;
      new_obj["grid_"] = new_grid;
      new_obj.pair["grid_"] = new_grid;
      for (var i=0; i<DE_target_shapes.length; i++) {
        var sh = DE_target_shapes[i];
        if (sh!=new_obj && sh["grid_"] >=new_grid) {
          sh["grid_"] += 1;
          sh.pair["grid_"] += 1;
        }
      }
      DE_snap_to_grid(true);
    }
  }
}

var DE_item_click_source = function (e, item)
{
  if (DE_locked) return;
  if (DE_connect_mode) {
    if (item != DE_connect_mode_shape)
      return;
    if (item != DE_kbd_focused_phrase)
      DE_ui_style_highlight(item);
    DE_connect_mode = false;
    DE_connect_mode_shape = null;
  } else {
    DE_ui_style_mark(item);
    DE_connect_mode = true;
    DE_connect_mode_shape = item;
  }
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
  DE_shapes.push(DE_paper.rect(x_shape, y, x_width, DE_ui_box_height, 5));
  tx = DE_texts[DE_texts.length-1];
  sh = DE_shapes[DE_shapes.length-1];
  // fix z-index
  tx.toFront();
  sh.toBack();
  // pair text/shape
  tx.pair = DE_shapes[DE_shapes.length-1];
  sh.pair = DE_texts[DE_texts.length-1];
  // style
  DE_ui_style_normal(DE_shapes[DE_shapes.length-1]);
  // meta
  sh["type_"] = type;
  sh["id_"] = DE_id;
  DE_shapes_by_id[DE_id] = sh;
  if (type == "target") {
    // :'(
    //sh.drag(DE_move, DE_dragger, DE_up).onDragOver(function(obj) { DE_collide(obj); })
    //sh.attr({ cursor: "move" });
    //tx.drag(DE_move, DE_dragger, DE_up);
    sh["grid_"] = DE_next_grid;
    sh["grid_tmp_"] = DE_next_grid;
    sh.click(function(e) {
      DE_item_click_target(e, this);
    });
    tx.click(function(e) {
      DE_item_click_target(e, this.pair);
    });
    DE_target_shapes.push(sh);
    // inline text editing
    DE_paper.inlineTextEditing(tx);
    sh.dblclick(function(){
      DE_enter_edit_mode(this);
    });
    tx.dblclick(function(){
      DE_enter_edit_mode(this.pair);
    })
  } else if (type == "source") {
    sh.click(function(e) {
      DE_item_click_source(e, this);
    });
    tx.click(function(e) {
      DE_item_click_source(e, this.pair);
    });
  }

  // mouseover -out
  sh.mouseover(function() {
    DE_item_mouseover(this);
  });
  sh.mouseout(function() {
    DE_item_mouseout(this);
  });
  tx.mouseover(function() {
    DE_item_mouseover(this.pair);
  });
  tx.mouseout(function() {
    //DE_item_mouseout(this.pair);
  });

  DE_id++;

  if (type == "target")
    DE_next_grid++;

  return sh;
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
    DE_make_obj(DE_ui_xbegin+DE_ui_padding, "", "target");
  } else {
    DE_make_obj(DE_shapes[max_idx].getBBox().x2+(DE_ui_margin-DE_ui_padding),
             "",
             "target");
  }
  DE_paper.setSize(
    DE_paper.width
      +DE_target_shapes[DE_target_shapes.length-1].getBBox().width
      +DE_ui_margin,
    DE_paper.height);

  DE_cur_drag = null;

  if (DE_target_shapes.length==1)
    DE_kbd_focus_shape(DE_target_shapes[0]);

  DE_snap_to_grid(true);
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
  if (!obj) return;
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
  DE_snap_to_grid(true);

  return;
}

var DE_enter_edit_mode = function (sh, kbd=false)
{
  if (DE_locked) return;
  if (DE_edit_mode) return;
  if (kbd && !DE_kbd_focused_phrase) return;
  if (DE_target_done.indexOf(sh)>-1) return;
  if (DE_rm_mult.indexOf(sh)>-1) return;
  DE_edit_mode = true;
  //sh.pair.toFront();
  //sh.toBack();
  DE_cur_ed = sh.pair;
  DE_cur_ed_shape = sh;
  var input = DE_cur_ed.inlineTextEditing.startEditing();
  input.addEventListener("keypress", function(e) {
    if (e.keyCode==27
        || e.keyCode==37
        || e.keyCode==38
        || e.keyCode==39
        || e.keyCode==40) { // esc, arrows, backspace
      return;
    } else if (e.keyCode == 8) { // backspace
      DE_cur_ed_shape.animate({width:DE_cur_ed_shape.getBBox().width-DE_ui_font_width},50);
      setTimeout(function(){DE_snap_to_grid(true);},125);
    } else if (e.keyCode == 13) { // return
      e.preventDefault();
      DE_cur_ed.inlineTextEditing.stopEditing();
      //DE_cur_ed_shape.toFront();
      //DE_cur_ed.toBack();
      DE_cur_ed_shape.animate({width:DE_cur_ed.getBBox().width+(DE_ui_margin-DE_ui_padding)},50);
      setTimeout(function(){DE_snap_to_grid(true);},125);
      DE_edit_mode = false;
    } else { // input
      DE_cur_ed_shape.animate({width:(this.value.length*DE_ui_font_width)+2*DE_ui_font_width+2*DE_ui_padding},25);
      setTimeout(function(){
        DE_snap_to_grid(true);
        DE_paper.setSize(DE_paper.width+DE_ui_font_width, DE_paper.height);
      },25);
    }
  });
  input.addEventListener("blur", function(e) {
      DE_cur_ed.inlineTextEditing.stopEditing();
      //DE_cur_ed_shape.toFront();
      //DE_cur_ed.toBack();
      DE_cur_ed_shape.animate({width:DE_cur_ed.getBBox().width+(DE_ui_margin-DE_ui_padding)},125);
      //setTimeout(function(){DE_snap_to_grid(true);},125);
      DE_edit_mode = false;
  }, true);
}

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
  d["align"]  = [];
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
  DE_kbd_focused_phrase = null;
  DE_kbd_move_mode      = false;
  DE_kbd_select_mode    = false;
  DE_target_done        = [];
  DE_locked             = false;

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
  var avg_box_len = (Math.max(c,d)
      / Math.max(DE_data_source.length,DE_data_target.length))*DE_ui_font_width;
  var paper_width  = DE_ui_xbegin+(Math.max(
        DE_data_source.length,
        DE_data_target.length)
         * (DE_ui_margin+DE_ui_padding+avg_box_len)),
      paper_height = DE_ui_ybegin+2*DE_ui_box_height+DE_ui_line_margin;
  DE_paper.setSize(paper_width, paper_height);

  // source objs
  DE_make_objs(DE_data_source, "source");
  // target objs
  DE_make_objs(DE_data_target, "target");
  // initial connections from alignment
  DE_make_conns_from_a(DE_data_align);

  // kbd interace
  DE_kbd_start_interface();
}

/******************************************************************************
 * keyboard interface
 *
 */
document.onkeypress = function (e) {
  if (DE_locked) return;
  if (DE_edit_mode) return;

  e = e || window.event;
  var char_code = e.which || e.keyCode;
  var char_str = String.fromCharCode(char_code);

  if (char_str == "X"
      && !DE_edit_mode
      && DE_kbd_focused_phrase
      && DE_rm_mult.indexOf(DE_kbd_focused_phrase)==-1) {
    if (DE_target_done.indexOf(DE_kbd_focused_phrase)>-1) {
      DE_target_done.splice(DE_target_done.indexOf(DE_kbd_focused_phrase),1);
    } else {
      DE_target_done.push(DE_kbd_focused_phrase);
      DE_kbd_move_mode = false;
      DE_kbd_select_mode = true;
    }
    DE_ui_style_highlight(DE_kbd_focused_phrase);
  }

  if (char_str == "A") { // add
    if (DE_target_shapes.length > 0) {
      var x = DE_kbd_focused_phrase.attr("x")+DE_kbd_focused_phrase.attr("width")
              +2*DE_ui_padding;
      var new_obj = DE_make_obj(x, "", "target");
      var new_grid = DE_kbd_focused_phrase["grid_"]+1;
      new_obj["grid_"] = new_grid;
      new_obj.pair["grid_"] = new_grid;
      for (var i=0; i<DE_target_shapes.length; i++) {
        var sh = DE_target_shapes[i];
        if (sh!=new_obj && sh["grid_"] >=new_grid) {
          sh["grid_"] += 1;
          sh.pair["grid_"] += 1;
        }
      }
    } else {
      var new_obj = DE_make_obj(0, "", "target");
      DE_kbd_focus_shape(new_obj);
    }
    DE_snap_to_grid(true);
  } else if (char_str == "M") { // move mode
    if (DE_kbd_move_mode) {
      DE_kbd_move_mode = false;
      DE_kbd_select_mode = true;
    } else {
      if (DE_target_done.indexOf(DE_kbd_focused_phrase)>-1) return;
      DE_kbd_move_mode = true;
      DE_kbd_select_mode = false;
    }
  } else if (char_str == "E") { // edit mode
    DE_enter_edit_mode(DE_kbd_focused_phrase, true);
  } else if (char_str=="S") { // select mode
    if (DE_kbd_select_mode) {
      DE_kbd_move_mode = false;
    } else {
      DE_kbd_select_mode = true;
      DE_kbd_move_mode = false;
    }
  } else if (char_str == "D") { // remove
    var x = false;
    if (DE_rm_mult.indexOf(DE_kbd_focused_phrase) > -1)
      x = true;
    if (DE_rm_mult.length>0) {
      for (var i=0; i<DE_rm_mult.length; i++) {
        rm_obj(DE_rm_mult[i]);
      }
      DE_rm_mult = [];
      if (x) {
        DE_kbd_select_mode = true;
        DE_kbd_move_mode = false;
        if (DE_target_shapes.length > 0)
          DE_kbd_focus_shape(DE_target_shapes[0]);
      }
    } else {
      var d = DE_kbd_focused_phrase;
      if (DE_target_done.indexOf(d) > -1) return;
      DE_kbd_focused_phrase = DE_kbd_get_next_to("right", DE_kbd_focused_phrase);
      if (!DE_kbd_focused_phrase) {
        DE_kbd_focused_phrase = DE_kbd_get_next_to("left", d);
      }
      DE_kbd_focus_shape(DE_kbd_focused_phrase);
      rm_obj(d);
    }
  }

  if (DE_kbd_select_mode && DE_kbd_focused_phrase) { // select <- ->
    if (e.keyCode == 39) {        // right
      e.preventDefault();
      DE_kbd_select_phrase("right", DE_kbd_focused_phrase);
    } else if (e.keyCode == 37) { // left
      e.preventDefault();
      DE_kbd_select_phrase("left", DE_kbd_focused_phrase);
    }
  }

  if (DE_kbd_move_mode && DE_kbd_focused_phrase) { // move <- ->
    if (e.keyCode == 39) {        // right
      e.preventDefault();
      DE_kbd_swap("right", DE_kbd_focused_phrase);
    } else if (e.keyCode == 37) { // left
      e.preventDefault();
      DE_kbd_swap("left", DE_kbd_focused_phrase);
    }
  }
};

var DE_kbd_get_next_to = function(dir, shape)
{
  if (!shape) return null;

  DE_target_shapes.sort(function(a, b) {
    return a["grid_"]-b["grid_"];
  });

  for (var i=0; i<DE_target_shapes.length; i++)
    DE_target_shapes[i]["grid_"] = i;

  var grid_pos = [];
  for (var i=0; i<DE_target_shapes.length; i++)
    grid_pos.push(DE_target_shapes[i]["grid_"]);
  var at = grid_pos.indexOf(shape["grid_"]);
  if ((at==0 && dir=="left") || (at==DE_target_shapes.length-1 && dir=="right"))
    return;

  var obj = null;
  if (dir == "left") {
    obj = DE_target_shapes[at-1];
  } else { // right
    obj = DE_target_shapes[at+1];
  }

  return obj;
}

var DE_kbd_select_phrase = function(dir="right", shape)
{
  var obj = DE_kbd_get_next_to(dir, shape);

  if (obj)
    DE_kbd_focus_shape(obj, DE_kbd_focused_phrase);
}

var DE_kbd_focus_shape = function(obj, obj2=null)
{
  if (!obj) return;

  // reset others
  for (c in DE_connections)
    DE_connections[c].line.attr({"stroke-width":DE_ui_stroke_width});
  for (sh in DE_shapes_by_id)
    DE_ui_style_normal(DE_shapes_by_id[sh]);

  DE_kbd_focused_phrase = obj;

  // style
  DE_ui_style_highlight(obj);
  for (c in DE_connections) {
    if (parseInt(c.split("-")[1]) == DE_kbd_focused_phrase["id_"]) {
      DE_connections[c].line.attr({"stroke-width":DE_ui_stroke_width_hi});
      DE_ui_style_highlight(DE_shapes_by_id[parseInt(c.split("-")[0])], "source");
    }
  }
  if (obj2)
    DE_ui_style_normal(obj2);
}

var DE_kbd_swap = function(dir="right", shape)
{
  if (DE_edit_mode) return;
  if (!shape) return;
  if (DE_target_done.indexOf(shape)>-1) return;

  DE_target_shapes.sort(function(a, b) {
    return a["grid_"]-b["grid_"];
  });
  var grid_pos = [];
  for (var i=0; i<DE_target_shapes.length; i++)
    grid_pos.push(DE_target_shapes[i]["grid_"]);
  var at = grid_pos.indexOf(shape["grid_"]);
  if ((at == 0 && dir=="left") || (at == DE_target_shapes.length-1 && dir=="right"))
    return;

  var obj = null;
  if (dir == "left") {
    obj = DE_target_shapes[at-1];
  } else { // right
    obj = DE_target_shapes[at+1];
  }

  // right -> left
  if (dir == "left") {
    att = { x: obj.attr("x")+shape.getBBox().width+(DE_ui_margin-2*DE_ui_padding) };
    obj.attr(att);
    att = { x: obj.pair.attr("x")+shape.getBBox().width+(DE_ui_margin-2*DE_ui_padding) };
    obj.pair.attr(att);

    att = { x: shape.attr("x")-(obj.getBBox().width+(DE_ui_margin-2*DE_ui_padding)) };
    shape.attr(att);
    att = { x: shape.pair.attr("x")-(obj.getBBox().width+(DE_ui_margin-2*DE_ui_padding)) };
    shape.pair.attr(att);
  } else { // right
    att = { x: obj.attr("x")-(shape.getBBox().width+(DE_ui_margin-2*DE_ui_padding)) };
    obj.attr(att);
    att = { x: obj.pair.attr("x")-(shape.getBBox().width+(DE_ui_margin-2*DE_ui_padding)) };
    obj.pair.attr(att);

    att = { x: shape.attr("x")+(obj.getBBox().width+(DE_ui_margin-2*DE_ui_padding)) };
    shape.attr(att);
    att = { x: shape.pair.attr("x")+(obj.getBBox().width+(DE_ui_margin-2*DE_ui_padding)) };
    shape.pair.attr(att);
  }

  // grid pos
  var tmp_pos = shape["grid_"];
  shape["grid_"] = obj["grid_"];
  obj["grid_"] = tmp_pos;

  for (key in DE_connections) {
    DE_paper.connection(DE_connections[key]);
  }
}

var DE_kbd_start_interface = function ()
{
  DE_kbd_focus_shape(DE_target_shapes[0]);
  DE_kbd_select_mode = true;
}


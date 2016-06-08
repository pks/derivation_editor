/*
 * Global vars and configuration
 *
 */
var DE_paper,
///////////////////////////////////////////////////////////////////////////////
    // Objects
    DE_shapes        = [],
    DE_target_shapes = [],
    DE_shapes_by_id  = {},
    DE_texts         = [],
    DE_connections   = {},
    DE_id            = 0,
    DE_next_grid     = 0,
///////////////////////////////////////////////////////////////////////////////
    // UI
    DE_ui_margin          = 64,
    DE_ui_padding         = DE_ui_margin/3,
    DE_ui_xbegin          = 10,
    DE_ui_ybegin          = 5,
    DE_ui_box_height      = 32,
    DE_ui_line_margin     = 70,
    DE_ui_ysource         = DE_ui_ybegin,
    DE_ui_ytarget         = DE_ui_ysource+DE_ui_line_margin;
    DE_ui_font_size       = 14,
    DE_ui_font_width      = -1,
    DE_ui_stroke_width    = 1,
    DE_ui_stroke_width_hi = 3,
    DE_ui_align_stroke    = "#aaa",
    DE_ui_align_stroke_hi = "#000",
    DE_ui_text_att  = { "text-anchor": "start", "font-size": DE_ui_font_size,
                        "font-family": "Times New Roman" },
    DE_ui_lock            = false,
///////////////////////////////////////////////////////////////////////////////
    // Keyboard interface
    DE_kbd_focused_phrase = null,
    DE_kbd_move_mode      = false,
    DE_kbd_select_mode    = false,
    // Connecting
    DE_connect_mode       = false,
    DE_connect_mode_shape = null,
    DE_new_conns          = [],
    // Editing
    DE_cur_ed       = null,
    DE_cur_ed_shape = null,
    DE_edit_mode    = false,
    // Removing
    DE_rm_mult  = [],
    DE_undo_stack = [],
    // Data
    DE_target_done = [],
    DE_data_source     = null,
    DE_data_source_raw = null,
    DE_data_target     = null,
    DE_data_align      = null,
    DE_count_click     = 0,
    DE_count_kbd       = 0;


///////////////////////////////////////////////////////////////////////////////
//
// Style
//
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

  DE_color_source_phrases();
}

var DE_ui_style_normal = function (item, type=null)
{
  if (item == DE_connect_mode_shape) {
    DE_ui_style_mark(item, type);
    return;
  }
  if (!item) return;
  if (!type) type = item["type_"];
  var color              = "#fff";
  var stroke_color       = "#aaa";
  var text_color         = "#aaa";
  if (DE_rm_mult.indexOf(item)>-1)
    color = stroke_color = "#f00";
  if (DE_target_done.indexOf(item)>-1) {
    color                = "#aaa";
    text_color           = "#000";
    stroke_color         = "#000";
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
  var foc = false;
  if (item == DE_kbd_focused_phrase) foc = true;
  if (item == DE_connect_mode_shape) {
    DE_ui_style_mark(item, type);
    return;
  }
  if (!type) type = item["type_"];
  var color              = "#fff";
  var stroke_color       = "#000";
  var stroke_width       = 3;
  var text_color         = "#000";
  if (DE_rm_mult.indexOf(item)>-1)
    color = stroke_color = "#f00";
  if (DE_target_done.indexOf(item)>-1) {
    color                = "#aaa";
    text_color           = "#000";
    stroke_color         = "#000";
    stroke_width         = 3;
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
    if (foc) stroke_width = stroke_width*1.5;
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
      "stroke-width": 3
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

///////////////////////////////////////////////////////////////////////////////
//
//  Connections
//
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
  return obj1["id_"] + "-" + obj2["id_"];
}

var DE_make_conn = function(obj1, obj2)
{
  DE_connections[DE_conn_str(obj1,obj2)] = DE_paper.connection(obj1, obj2);
  if (DE_connect_mode) {
    DE_new_conns.push(DE_connections[DE_conn_str(obj1,obj2)]);
    DE_connections[DE_conn_str(obj1,obj2)].line.attr({
      "stroke"       : DE_ui_align_stroke_hi,
      "stroke-width" : DE_ui_stroke_width_hi
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

  DE_shapes_by_id[id1].attr({"stroke-width" : DE_ui_stroke_width});
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

///////////////////////////////////////////////////////////////////////////////
//
// Snap-to-grid
//
var DE_snap_to_grid = function ()
{
  // just x coord, y is fixed
  var d = DE_ui_xbegin;
  // just target objs
  DE_target_shapes.sort(function(a, b) {
    return a["grid_"]-b["grid_"];
  });
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
    obj.attr(att);
    att = { x: obj.getBBox().x+DE_ui_padding };
    obj.pair.attr(att);
    d += obj.getBBox().width+(DE_ui_margin-2*DE_ui_padding);
  }
  for (key in DE_connections) {
    DE_paper.connection(DE_connections[key]);
  }
}

///////////////////////////////////////////////////////////////////////////////
//
// Mouseover -out / click events
//
var DE_item_mouseover = function (item)
{
  if (DE_edit_mode) return;

  // reset others
  var not_reset = [];
  for (c in DE_connections) {
    if (DE_shapes_by_id[parseInt(c.split("-")[1])] != DE_kbd_focused_phrase ||
        c.split("-")[1] != DE_kbd_focused_phrase["id_"]) {
      DE_connections[c].line.attr({"stroke-width":DE_ui_stroke_width});
      var x = DE_shapes_by_id[parseInt(c.split("-")[1])];
      if (DE_target_done.indexOf(x)==-1)
        DE_connections[c].line.attr({"stroke":"#aaa"});
    }
    if (c.split("-")[1] == DE_kbd_focused_phrase["id_"])
      not_reset.push(c.split("-")[0]);
  }
  not_reset.push(DE_kbd_focused_phrase["id_"]);
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
      DE_connections[c].line.attr({
        "stroke"       : DE_ui_align_stroke_hi,
        "stroke-width" : DE_ui_stroke_width_hi});
      if (DE_shapes_by_id[parseInt(c.split("-")[other_idx])]
            != DE_connect_mode_shape)
        DE_ui_style_highlight(
            DE_shapes_by_id[parseInt(c.split("-")[other_idx])]
        );
    }
  }

  if (item != DE_connect_mode_shape)
    DE_ui_style_highlight(item);
}

var DE_item_mouseout = function (item)
{
  if (DE_edit_mode) return;
  if (item == DE_connect_mode_shape) return;
  if (item == DE_kbd_focused_phrase) return;

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
    var align_done = false;
    if (DE_target_done.indexOf(DE_shapes_by_id[parseInt(c.split("-")[1])])>-1)
      align_done = true;
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
        var cc = c; // FIXME WTF
        if (!x) {
          if (!(DE_connect_mode_shape
                && obj["id_"]==DE_connect_mode_shape["id_"]))
            DE_ui_style_normal(obj);
        }
        if (align_done) {
          DE_connections[cc].line.attr({
            "stroke-width" : DE_ui_stroke_width,
            "stroke"       : DE_ui_align_stroke_hi});
        } else {
          DE_connections[cc].line.attr({
            "stroke-width" : DE_ui_stroke_width,
            "stroke"       : DE_ui_align_stroke});
        }
      } else {
        aligned_with_focused = true;
      }
    }
  }
  if (!aligned_with_focused)
      DE_ui_style_normal(item);
  for (var i=0; i<DE_new_conns.length; i++)
    DE_new_conns[i].line.attr({"stroke-width":DE_ui_stroke_width});
  DE_new_conns = [];
}

var DE_item_click_target = function (e, item)
{
  if (DE_ui_lock) return;
  if (DE_target_done.indexOf(item)>-1) return;
  if (DE_connect_mode) {
    DE_count_click += 1;
    if (DE_connections[DE_conn_str(DE_connect_mode_shape,item)]) {
      DE_undo_stack.push(["rm_conn", DE_connect_mode_shape["id_"],
          item["id_"]]);
      DE_rm_conn(DE_connect_mode_shape["id_"], item["id_"]);
      DE_ui_style_normal(DE_connect_mode_shape);
    } else {
      DE_ui_style_highlight(DE_connect_mode_shape);
      DE_connect_mode_shape.attr({"fill":"#fff","fill-opacity":1});
      DE_undo_stack.push(["add_conn", DE_connect_mode_shape["id_"],
          item["id_"]]);
      DE_make_conn(DE_connect_mode_shape, item);
    }
    DE_connect_mode = false;
    var b = false;
    if (DE_kbd_focused_phrase) {
    var focused_id = DE_kbd_focused_phrase["id_"];
    var src_id = DE_connect_mode_shape["id_"];
    for (c in DE_connections) {
      var a = c.split("-");
      if (a[0] == src_id && a[1]==focused_id) {
        b = true;
      }
      break;
    }
    }
    DE_connect_mode_shape.attr({"fill":"#fff"});
    if (b)
      DE_connect_mode_shape.attr({"stroke-width":3});
    DE_connect_mode_shape = null;
  }
}

var DE_item_click_source = function (e, item)
{
  if (DE_ui_lock) return;
  DE_count_click += 1;
  if (DE_connect_mode) {
    if (item != DE_connect_mode_shape)
      return;
    if (item != DE_kbd_focused_phrase)
      DE_ui_style_highlight(item);
    DE_connect_mode = false;
    DE_color_source_phrases();
    DE_connect_mode_shape = null;
    DE_ui_style_normal(item);
    item.attr({"stroke-width":"3px"});
  } else {
    DE_ui_style_mark(item);
    DE_connect_mode = true;
    DE_connect_mode_shape = item;
    DE_connect_mode_shape.attr({"fill":"#f00"});
  }
}

///////////////////////////////////////////////////////////////////////////////
//
// Add/remove objects
//
var DE_make_obj = function (x, text, type, grid_pos=null, id=null)
{
  var y;
  if (type == "source") {
    y = DE_ui_ysource;
  } else if (type == "target") {
    y = DE_ui_ytarget;
  }
  // make text obj
  DE_texts.push(DE_paper.text(x, y+(DE_ui_box_height/2), text)
      .attr(DE_ui_text_att));
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
  sh["id_"] = id;
  if (!id)
    sh["id_"] = DE_id;
  DE_shapes_by_id[sh["id_"]] = sh;
  if (type == "target") {
    sh["grid_"] = grid_pos;
    if (!sh["grid_"])
      sh["grid_"] = DE_next_grid;
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
      DE_count_click += 1;
      DE_enter_edit_mode(this);
    });
    tx.dblclick(function(){
      DE_count_click += 1;
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
    if (DE_ui_lock) return;
    DE_item_mouseover(this);
  });
  sh.mouseout(function() {
    if (DE_ui_lock) return;
    DE_item_mouseout(this);
  });
  tx.mouseover(function() {
    if (DE_ui_lock) return;
    DE_item_mouseover(this.pair);
  });
  tx.mouseout(function() {
    if (DE_ui_lock) return;
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

  if (DE_target_shapes.length==1)
    DE_kbd_focus_shape(DE_target_shapes[0]);

  DE_snap_to_grid();
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
  DE_snap_to_grid();

  return;
}

var DE_enter_edit_mode = function (sh, kbd=false)
{
  if (DE_ui_lock) return;
  if (DE_edit_mode) return;
  if (kbd && !DE_kbd_focused_phrase) return;
  if (DE_target_done.indexOf(sh)>-1) return;
  if (DE_rm_mult.indexOf(sh)>-1) return;
  DE_edit_mode = true;
  DE_cur_ed = sh.pair;
  DE_cur_ed_shape = sh;
  var input = DE_cur_ed.inlineTextEditing.startEditing();
  var text_before = $.trim($(DE_cur_ed.node.innerHTML).text())
  var id = sh["id_"];
  input.addEventListener("keypress", function(e) {
    if (e.keyCode==27
        || e.keyCode==37
        || e.keyCode==38
        || e.keyCode==39
        || e.keyCode==40) { // esc, arrows, backspace
      return;
    } else if (e.keyCode == 8) { // backspace
      DE_cur_ed_shape.animate({
        width:DE_cur_ed_shape.getBBox().width-DE_ui_font_width},50);
      setTimeout(function(){DE_snap_to_grid();},125);
    } else if (e.keyCode == 13) { // return
      e.preventDefault();
      e.stopPropagation();
      DE_cur_ed.inlineTextEditing.stopEditing();
      DE_cur_ed_shape.animate({
        width:DE_cur_ed.getBBox().width+(DE_ui_margin-DE_ui_padding)},50);
      setTimeout(function(){DE_snap_to_grid();},50);
      DE_edit_mode = false;
      var text_now = $.trim($(DE_cur_ed.node.innerHTML).text())
      if (text_before != text_now) {
        DE_undo_stack.push(["edit", id, text_before]);
      }
    } else { // input
      DE_cur_ed_shape.animate({
        width:(this.value.length*DE_ui_font_width)
          +2*DE_ui_font_width+2*DE_ui_padding},25);
      setTimeout(function(){
        DE_snap_to_grid();
        DE_paper.setSize(DE_paper.width+DE_ui_font_width, DE_paper.height);
      },25);
    }
  });
}

///////////////////////////////////////////////////////////////////////////////
//
// Extract data from ui
//
var DE_get_raw_svg_data = function()
{
  if (DE_paper)
    return btoa(DE_paper.canvas.innerHTML);
  else
    return "";
}

var DE_extract_data = function ()
{
  el = document.getElementById("data");
  d = {};
  d["source"]     = [];
  d["source_raw"] = [];
  d["target"]     = [];
  d["align"]      = [];
  // target
  var ids = [];
  DE_target_shapes.sort(function(a, b) {
    return a["grid_"]-b["grid_"];
  });
  for (var i=0; i<DE_target_shapes.length; i++) {
    var s = encodeURIComponent(DE_target_shapes[i].pair.attr("text"))
    if ($.trim(s)== "") {
      alert("Please remove any empty target phrases before submission.");
      return null;
    }
    d["target"].push(s);
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
      d["source"].push(encodeURIComponent(DE_shapes[i].pair.attr("text")));
    } else {
      break;
    }
  }
  // source_raw
  if (DE_data_source_raw) {
    for (var i=0; i<DE_data_source_raw.length; i++) {
      d["source_raw"].push(encodeURIComponent(DE_data_source_raw[i]));
    }
  }
  // image
  d["svg"] = DE_get_raw_svg_data();

  // meta
  d["count_click"] = DE_count_click;
  d["count_kbd"] = DE_count_kbd;

  // output
  s = JSON.stringify(d);
  el.innerHTML = s;

  return s;
}

///////////////////////////////////////////////////////////////////////////////
//
// Initialize/reset
//
var DE_reset = function(reset_meta=true)
{
  if (DE_ui_lock) return;
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

  DE_shapes             = [];
  DE_target_shapes      = [];
  DE_shapes_by_id       = {};
  DE_texts              = [];
  DE_connections        = {};
  DE_id                 = 0;
  DE_next_grid          = 0;
  DE_edit_mode          = false;
  DE_cur_ed             = null;
  DE_cur_ed_shape       = null;
  DE_connect_mode       = false;
  DE_connect_mode_shape = null;
  DE_kbd_focused_phrase = null;
  DE_kbd_move_mode      = false;
  DE_kbd_select_mode    = false;
  DE_target_done        = [];
  DE_undo_stack         = [];
  if (reset_meta) {
    DE_count_click        = 0;
    DE_count_kbd          = 0;
  }

  document.getElementById("holder").parentElement.removeChild(
    document.getElementById("holder")
  );
  var new_holder = document.createElement("div");
  new_holder.style = "width:100%;overflow=scroll;overflow-y: auto";
  new_holder.setAttribute("id","holder");
  $("#derivation_editor").prepend(new_holder);
}

var DE_init = function (reset_meta=true)
{
  if (!data) return;
  DE_reset();

  DE_data_source     = data["source_groups"];
  DE_data_source_raw = data["source_groups_raw"];
  DE_data_target     = data["target_groups"];
  DE_data_align      = data["phrase_alignment"];

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

  // keyboard interace
  DE_kbd_start_interface();
}

///////////////////////////////////////////////////////////////////////////////
//
// Keyboard interface
//
document.onkeypress = function (e) {
  if (DE_ui_lock) return;
  if (DE_edit_mode) return;
  DE_count_kbd += 1;

  e = e || window.event;
  var char_code = e.which || e.keyCode;
  var char_str = String.fromCharCode(char_code);

  if (e.keyCode==13 && DE_kbd_move_mode) {
    e.preventDefault();
    e.stopPropagation();
    DE_kbd_move_mode = false;
    DE_kbd_select_mode = true;
    DE_snap_to_grid();
    return;
  }

  if (e.keyCode == 13
      && !DE_edit_mode
      && DE_kbd_focused_phrase
      && DE_rm_mult.indexOf(DE_kbd_focused_phrase)==-1) {
    e.preventDefault();
    if (DE_target_done.indexOf(DE_kbd_focused_phrase)>-1) {
      DE_target_done.splice(DE_target_done.indexOf(DE_kbd_focused_phrase),1);
      DE_color_source_phrases();
    } else {
      DE_target_done.push(DE_kbd_focused_phrase);
      DE_kbd_select_phrase("right", DE_kbd_focused_phrase);
      DE_kbd_move_mode = false;
      DE_kbd_select_mode = true;
    }
    DE_ui_style_highlight(DE_kbd_focused_phrase);
  }

  if (char_str == "A") { // add
    if (DE_target_shapes.length > 0) {
      var x = DE_kbd_focused_phrase.attr("x")
        +DE_kbd_focused_phrase.attr("width")
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
    DE_snap_to_grid();
  } else if (char_str == "U") {
    DE_undo();
  } else if (char_str == "M") { // move mode
    if (DE_kbd_move_mode) {
      DE_kbd_move_mode = false;
      DE_kbd_select_mode = true;
      DE_snap_to_grid();
    } else {
      if (DE_target_done.indexOf(DE_kbd_focused_phrase)>-1) return;
      DE_kbd_move_mode = true;
      DE_kbd_select_mode = false;
    }
  } else if (char_str == "E") { // edit mode
    DE_enter_edit_mode(DE_kbd_focused_phrase, true);
  } else if (char_str == "I") {
    DE_kbd_jump_to_phrase(DE_target_shapes[0])
  } else if (char_str == "O") {
    DE_kbd_jump_to_phrase(DE_target_shapes[DE_target_shapes.length-1])
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
      DE_kbd_focused_phrase = DE_kbd_get_next_to("right",
          DE_kbd_focused_phrase);
      if (!DE_kbd_focused_phrase) {
        DE_kbd_focused_phrase = DE_kbd_get_next_to("left", d);
      }
      DE_kbd_focus_shape(DE_kbd_focused_phrase);
      var connected_source_phrases = [];
      for (c in DE_connections) {
        var i = parseInt(c.split('-')[1]);
        if (i == d["id_"])
          connected_source_phrases.push(DE_connections[c].from);
      }
      if (d) {
        DE_undo_stack.push([
            "rm", d["grid_"], d["id_"],
            $(d.pair.node.innerHTML).text(),
            connected_source_phrases
        ]);
        rm_obj(d);
      }
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
  if ((at==0 && dir=="left")
      || (at==DE_target_shapes.length-1 && dir=="right"))
    return;

  var obj = null;
  if (dir == "left") {
    obj = DE_target_shapes[at-1];
  } else { // right
    obj = DE_target_shapes[at+1];
  }

  return obj;
}

var isOnScreen = function(obj)
{

    var win = $("#holder");

    var viewport = {
        left : win.scrollLeft()
    };
    viewport.right = viewport.left + win.width();

    var bounds = {};
    bounds.left = obj.getBBox().x;
    bounds.right = obj.getBBox().x+obj.getBBox().width;

    if (viewport.right < bounds.right)
      return 0;
    else if (viewport.left > bounds.left)
      return 1;

    return 2;
};

var check_isOnScreen = function (obj)
{
  var x = isOnScreen(obj)
  while (x < 2) {
    if (x == 0) {
      $("#holder").scrollTo($("#holder").scrollLeft()+1.5*obj.getBBox().width);
    } else if (x == 1) {
      $("#holder").scrollTo($("#holder").scrollLeft()-1.5*obj.getBBox().width);
    }
    x = isOnScreen(obj);
  }
}

var DE_kbd_jump_to_phrase = function(obj)
{
  if (obj == DE_kbd_focused_phrase) return;
  if (obj) {
    DE_kbd_focus_shape(obj, DE_kbd_focused_phrase);
    check_isOnScreen(obj);
  }
}

var DE_kbd_select_phrase = function(dir="right", shape)
{
  var obj = DE_kbd_get_next_to(dir, shape);

  if (obj) {
    DE_kbd_focus_shape(obj, DE_kbd_focused_phrase);
    check_isOnScreen(obj);
  }
}

var DE_kbd_focus_shape = function(obj, obj2=null)
{
  if (!obj) return;

  // reset others
  for (c in DE_connections) {
    var align_done = false;
    if (DE_target_done.indexOf(DE_shapes_by_id[parseInt(c.split("-")[1])])>-1)
      align_done = true;
    if (align_done) {
      DE_connections[c].line.attr({
        "stroke-width":DE_ui_stroke_width, "stroke":DE_ui_align_stroke_hi
      });
    } else {
      DE_connections[c].line.attr({
        "stroke-width":DE_ui_stroke_width, "stroke":DE_ui_align_stroke
      });
    }
  }
  for (sh in DE_shapes_by_id)
    DE_ui_style_normal(DE_shapes_by_id[sh]);

  DE_kbd_focused_phrase = obj;

  // style
  DE_ui_style_highlight(obj);
  for (c in DE_connections) {
    if (parseInt(c.split("-")[1]) == DE_kbd_focused_phrase["id_"]) {
      DE_connections[c].line.attr({
        "stroke-width" : DE_ui_stroke_width_hi,
        "stroke"       : DE_ui_align_stroke_hi});
      DE_ui_style_highlight(DE_shapes_by_id[parseInt(c.split("-")[0])],
          "source");
    }
  }
  if (obj2)
    DE_ui_style_normal(obj2);

  check_isOnScreen(obj);
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
  if ((at == 0 && dir=="left")
      || (at == DE_target_shapes.length-1 && dir=="right"))
    return;

  var obj = null;
  if (dir == "left") {
    obj = DE_target_shapes[at-1];
  } else { // right
    obj = DE_target_shapes[at+1];
  }

  // right -> left
  if (dir == "left") {
    att = {
      x: obj.attr("x")+shape.getBBox().width
        +(DE_ui_margin-2*DE_ui_padding)
    };
    obj.attr(att);
    att = { x: obj.pair.attr("x")+shape.getBBox().width
      +(DE_ui_margin-2*DE_ui_padding)
    };
    obj.pair.attr(att);

    att = {
      x: shape.attr("x")-(obj.getBBox().width
        +(DE_ui_margin-2*DE_ui_padding))
    };
    shape.attr(att);
    att = {
      x: shape.pair.attr("x")-(obj.getBBox().width
        +(DE_ui_margin-2*DE_ui_padding))
    };
    shape.pair.attr(att);
  } else { // right
    att = {
      x: obj.attr("x")-(shape.getBBox().width
        +(DE_ui_margin-2*DE_ui_padding))
    };
    obj.attr(att);
    att = {
      x: obj.pair.attr("x")-(shape.getBBox().width
        +(DE_ui_margin-2*DE_ui_padding))
    };
    obj.pair.attr(att);

    att = {
      x: shape.attr("x")+(obj.getBBox().width+(DE_ui_margin-2*DE_ui_padding))
    };
    shape.attr(att);
    att = {
      x: shape.pair.attr("x")
        +(obj.getBBox().width+(DE_ui_margin-2*DE_ui_padding))
    };
    shape.pair.attr(att);
  }

  // grid pos
  var tmp_pos = shape["grid_"];
  shape["grid_"] = obj["grid_"];
  obj["grid_"] = tmp_pos;

  for (key in DE_connections) {
    DE_paper.connection(DE_connections[key]);
  }

  check_isOnScreen(shape);
}

var DE_kbd_start_interface = function ()
{
  //alert($("#holder").width());
  DE_kbd_focus_shape(DE_target_shapes[0]);
  DE_kbd_select_mode = true;
}

///////////////////////////////////////////////////////////////////////////////
//
// Undo/redo
//
var DE_undo = function ()
{
  var x = DE_undo_stack.pop();
  if (!x) return;

  if (x[0] == "rm") {
    DE_undo_rm(x[1], x[2], x[3], x[4]);
  } else if (x[0] == "edit") {
    DE_undo_edit(x[1], x[2]);
  } else if (x[0] == "rm_conn") {
    DE_make_conn(DE_shapes_by_id[x[1]], DE_shapes_by_id[x[2]]);
    if (DE_shapes_by_id[x[2]] == DE_kbd_focused_phrase) {
      DE_connections[x[1]+"-"+x[2]].line.attr({
        "stroke"       : "#000",
        "stroke-width" : DE_ui_stroke_width_hi});
      DE_ui_style_highlight(DE_shapes_by_id[x[1]]);
    }
  } else if (x[0] == "add_conn") {
    DE_rm_conn(x[1], x[2]);
  } else {
    return;
  }
}

var DE_undo_edit = function (id, text)
{
  var obj = DE_shapes_by_id[id];
  obj.pair.attr("text", text);
  obj.attr({"width": obj.pair.getBBox().width+(DE_ui_margin-DE_ui_padding)});
  DE_snap_to_grid();
}

var DE_undo_rm = function (grid_pos, id, text, source_phrases)
{
  DE_target_shapes.sort(function(a, b) {
    return a["grid_"]-b["grid_"];
  });

  var j;
  var rightmost=0;
  var found = false;
  for (var i = 0; i<DE_target_shapes.length; i++) {
    if (DE_target_shapes[i]["grid_"]>=grid_pos) {
      if (!found) {
        j = i;
        found = true;
      }
      DE_target_shapes[i]["grid_"] += 1;
    }
    rightmost++;
  }

  if (!j) {
    j = rightmost;
  }

  var x = DE_ui_xbegin;
  if (DE_target_shapes[j]) {
    x = DE_target_shapes[j].attr("x")+DE_target_shapes[j].attr("width")
           +2*DE_ui_padding;
  }

  var obj = DE_make_obj(x, text, "target", grid_pos, id);
  obj["grid_"] = grid_pos;
  DE_snap_to_grid();

  for (var i=0; i<source_phrases.length; i++) {
    DE_make_conn(source_phrases[i], obj);
  }

  if (!DE_kbd_focused_phrase)
    DE_kbd_focus_shape(obj);
}

var DE_color_source_phrases = function ()
{
  var have = {};
  var done = {};
  for (shid in DE_shapes_by_id) {
    if (DE_shapes_by_id[shid]["type_"] == "source") {
      for (c in DE_connections) {
        var a = c.split("-");
        if (shid == parseInt(a[0])) {
          if (have[shid]) {
            have[shid] += 1;
          } else {
            have[shid] = 1;
            done[shid] = 0;
          }
          if (DE_target_done.indexOf(DE_shapes_by_id[a[1]])>-1) {
            done[shid] += 1;
          }
        }
      }
    }
  }

  for (shid in have) {
    var b = false;
    if (DE_connect_mode && DE_shapes_by_id[shid] == DE_connect_mode_shape) {
      DE_shapes_by_id[shid].attr({"fill":"#f00"});
      b = true;
    }
    if (have[shid] == done[shid]) {
      if (!b)
        DE_shapes_by_id[shid].attr({"fill":"#aaa"});
    } else {
      if (!b)
        DE_shapes_by_id[shid].attr({"fill":"#fff"});
    }
  }
}

var DE_check_align = function ()
{
  var aligned_source = {};
  var aligned_target = {};
  for (key in DE_connections) {
    var a = key.split("-");
    aligned_source[Number(a[0])] = true;
    aligned_target[Number(a[1])] = true;
  }

  var all_aligned = true;
  for (var i = 0; i < DE_shapes.length; i++) {
    var t = DE_shapes[i]["type_"];
    var id = DE_shapes[i]["id_"];
    if (t == "target") {
      if (!aligned_target[id]) {
        all_aligned = false;
        break;
      }
    } else if (t == "source") {
      if (!aligned_source[id]) {
        all_aligned = false;
        break;
      }
    }
  }

  return all_aligned;
}

$(document).mouseup(function (e) {
  if ($(e.target).attr("id") == "holder")
    //alert(e.pageY);
    DE_count_click += 1;
});



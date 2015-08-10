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

var el;
window.onload = function () {
    var color, i, ii, tempS, tempT,
        dragger = function () {
                // Original coords for main element
            this.ox = this.type == "ellipse" ? this.attr("cx") : this.attr("x");
            this.oy = this.type == "ellipse" ? this.attr("cy") : this.attr("y");
            if (this.type != "text") this.animate({"fill-opacity": .2}, 500);
                
                // Original coords for pair element
            this.pair.ox = this.pair.type == "ellipse" ? this.pair.attr("cx") : this.pair.attr("x");
            this.pair.oy = this.pair.type == "ellipse" ? this.pair.attr("cy") : this.pair.attr("y");
            if (this.pair.type != "text") this.pair.animate({"fill-opacity": .2}, 500);            
        },
        move = function (dx, dy) {
                // Move main element
            var att = {x: this.ox + dx, y: this.oy + dy};
            this.attr(att);
            
                // Move paired element
            att = {x: this.pair.ox + dx, y: this.pair.oy + dy};
            this.pair.attr(att);            
            
                // Move connections
            for (i = connections.length; i--;) {
                r.connection(connections[i]);
            }
            r.safari();
        },
        up = function () {
            // Fade original element on mouse up
            if (this.type != "text") this.animate({"fill-opacity": 0}, 500);
            
            // Fade paired element on mouse up
            if (this.pair.type != "text") this.pair.animate({"fill-opacity": 0}, 500);            

            snapToGrid(this);
            snapToGrid(this.pair);
        },

        grid = {a:null, b:null, c:null};
        function snapToGrid(obj)
        {
          var n = null;

          if (obj.type == "text") {
            sy = 160;
            ty = 150;
          } else {
            sy = 150;
            ty = 160;
          }

          if (obj.getBBox().y != sy) {
            att = {y: sy};
            obj.attr(att);            
            att = {y: ty};
            obj.pair.attr(att);            
            for (i = connections.length; i--;) {
                r.connection(connections[i]);
            }
          }
        }

        r = Raphael("holder", 640, 480),

        connections = [],
        source = ["das", "ist ein", "kleines", "haus"],
        target = ["this", "is a", "small", "house"],
        csz = 7;
        padding = 15,
        inner_pad = 5,
        begin = 10,
        texts = [],
        shapes = [],
        texts.push(r.text(padding, 110, source[0]).attr({'text-anchor': 'start'})),
        texts.push(r.text(padding+texts[0].getBBox().x2, 110, source[1]).attr({'text-anchor': 'start'}))
        texts.push(r.text(padding+texts[1].getBBox().x2, 110, source[2]).attr({'text-anchor': 'start'}))
        texts.push(r.text(padding+texts[2].getBBox().x2, 110, source[3]).attr({'text-anchor': 'start'}))
        shapes.push(r.rect(padding-inner_pad, 100, texts[0].getBBox().width+(2*inner_pad), 20))
        shapes.push(r.rect(shapes[0].getBBox().x2+inner_pad, 100, texts[1].getBBox().width+(2*inner_pad), 20))
        shapes.push(r.rect(shapes[1].getBBox().x2+inner_pad, 100, texts[2].getBBox().width+(2*inner_pad), 20))
        shapes.push(r.rect(shapes[2].getBBox().x2+inner_pad, 100, texts[3].getBBox().width+(2*inner_pad), 20))

        texts.push(r.text(padding,                       160, target[0]).attr({'text-anchor': 'start'})),
        texts.push(r.text(padding+texts[4].getBBox().x2, 160, target[1]).attr({'text-anchor': 'start'}))
        texts.push(r.text(padding+texts[5].getBBox().x2, 160, target[2]).attr({'text-anchor': 'start'}))
        texts.push(r.text(padding+texts[6].getBBox().x2, 160, target[3]).attr({'text-anchor': 'start'}))
        shapes.push(r.rect(padding-inner_pad,                150, texts[4].getBBox().width+(2*inner_pad), 20))
        shapes.push(r.rect(shapes[4].getBBox().x2+inner_pad, 150, texts[5].getBBox().width+(2*inner_pad), 20))
        shapes.push(r.rect(shapes[5].getBBox().x2+inner_pad, 150, texts[6].getBBox().width+(2*inner_pad), 20))
        shapes.push(r.rect(shapes[6].getBBox().x2+inner_pad, 150, texts[7].getBBox().width+(2*inner_pad), 20))

    for (i = 0, ii = shapes.length; i < ii; i++) {
        tempS = shapes[i].attr({fill: "#aaa", stroke: "#000", "fill-opacity": 0, "stroke-width": 1, cursor: "move"});
        tempT =  texts[i].attr({fill: "#000", stroke: "none",  cursor: "move"});
        if (i >= 4) {
          shapes[i].drag(move, dragger, up);
          texts[i].drag(move, dragger, up);
        }
        
        // Associate the elements
        tempS.pair = tempT;
        tempT.pair = tempS;
    }

    connections.push(r.connection(shapes[0], shapes[4], "#000"));
    connections.push(r.connection(shapes[1], shapes[5], "#000"));
    connections.push(r.connection(shapes[2], shapes[6], "#000"));
    connections.push(r.connection(shapes[3], shapes[7], "#000"));
};

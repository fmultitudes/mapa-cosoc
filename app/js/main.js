ko.bindingHandlers.spanishNumber = {
    update: function(element, valueAccessor, allBindingsAccessor) {
        var value = ko.utils.unwrapObservable(valueAccessor()),
            precision = ko.utils.unwrapObservable(allBindingsAccessor().precision) || ko.bindingHandlers.spanishNumber.defaultPrecision,
            suffix = ko.utils.unwrapObservable(allBindingsAccessor().suffix) || ko.bindingHandlers.spanishNumber.defaultSuffix,
            formattedValue = value.toFixed(precision).replace('.',',')+suffix;
        
        ko.bindingHandlers.text.update(element, function() { return formattedValue; });
    },
    defaultPrecision: 0,
    defaultSuffix: ''
};

var MapasChile;

;(function(global, document, $, ko, _){

    "use strict";

    MapasChile = {};

    MapasChile.key = '1C12Iz4HhdlbSyu8hiVWsBJkSauSVJ0Vt2fKOS48zl2E';

    MapasChile.container = d3.select("#chile-mapas");

    MapasChile.svg = null;

    MapasChile.binding = {
        regiones: ko.observableArray([]),
        comunas: ko.observableArray([]),
        selected: ko.observable(false),
        loaded: ko.observable(false),
        cosoc_total : ko.observable('')
    };

    MapasChile.getTextSesiones = function(code){

        var values = {
            '':'',
            '-':'No contesta',
            '1': 'Menos de 4',
            '2': 'Menos de 4',
            '3': 'Menos de 4',
            '4': '4',
            '5': 'M&aacute;s de 4'
        };

        return values[code];

    };

    MapasChile.getTextTamano = function(code){
        var values = {
            '':'',
            '-': 'No contesta',
            '1': 'M&aacute;s de 30',
            '2': 'Entre 20 y 29',
            '3': 'Entre 10 y 19',
            '4': 'Entre 5 y 9'
        };

        return values[code];

    };

    MapasChile.dotsData = [];

    MapasChile.colores = [
        '#f7fbff',
        '#deebf7',
        '#c6dbef',
        '#9ecae1',
        '#6baed6',
        '#4292c6',
        '#2171b5',
        '#08519c',
        '#08306b',
        '#00001F'
            ];

    MapasChile.quantize = d3.scale.quantize()
        .domain([0, 100])
        .range(d3.range(10).map(function(i) { return MapasChile.colores[i]; }));

    MapasChile.tip = d3.tip()
        .attr('class','map-tooltip')
        .offset([-20,0])
        .html(function(d) { 
            var html = ['<p class="region">'+d.nombre+'</p>'];
            html.push('<p>'+d.conformado_porcentaje+'% conformado</p>');
            return html.join(''); });

    MapasChile.init = function(){

        ko.applyBindings(MapasChile.binding);

        Tabletop.init( { 
            key: MapasChile.key,
            callback: MapasChile.dataLoaded,
            parseNumbers: true,
            debug: true
        } );

        $('.back').on('click',function(){
            MapasChile.unselect();
        });

    };

    MapasChile.dataLoaded = function(data, tabletop){
        MapasChile.regiones = data.Regiones.elements;        
        MapasChile.comunas = data.Comunas.elements;
        MapasChile.binding.regiones(MapasChile.regiones);
        var sum = _.reduce(data.Regiones.elements, function(total, r) {
              return total + parseInt(r.conformado);
            },0);
        MapasChile.binding.cosoc_total(sum);
        MapasChile.binding.loaded(true);
        MapasChile.render();
    };

    MapasChile.render = function(){

        var that = this;

        var sizes = MapasChile.container.node().getBoundingClientRect();

        var width = sizes.width,
            height = 250;

        MapasChile.svg = MapasChile.container.append("svg")
            .attr("width", width)
            .attr("height", height);

        MapasChile.svg.call(MapasChile.tip);

        var chile = REGIONES_TOPOJSON; //from regiones.json
        
        var projection = d3.geo.mercator()
            .scale((width/100)*130)
            .translate([width / 2, height / 2])
            .precision(0.1)
            .rotate([0,-250,0])
            .center([-58,27]);

        var back = MapasChile.svg
            .append("rect")
            .attr("class", 'svg-back')
                        .style("fill", "#fff")
                        .style("opacity", 0)
                        .attr("x", 0)
                        .attr("y", 0)
                        .attr("width", width)
                        .attr("height", height)
                        .on("click",function(d){
                            that.unselect();
                        });


        var pathsGroup = MapasChile.svg
            .append("g")
            .attr("class", 'paths-group');

        var linesGroup = MapasChile.svg
            .append("g")
            .attr("class", 'lines-group');

        var dotsGroup = MapasChile.svg
            .append("g")
            .attr("class", 'dots-group');

        var voronoiGroup = MapasChile.svg
            .append("g")
            .attr("class", 'voronoi-group');

        

        //voronoi
        var voronoi = d3.geom.voronoi()
            .clipExtent([[0, 0], [width, height]]);

        var regiones = pathsGroup.selectAll(".region")
            .data(topojson.feature(chile, chile.objects.regiones).features)
            .enter().append("path")
            .attr("class", function(d) { return "region " + d.id; })
            .attr("id", function(d) { return "region-" + d.id; })
            .attr("d", d3.geo.path().projection(projection))
            .style("fill",function(d){
                var value = that.getRegion(d.id);
                return that.quantize(value.conformado_porcentaje);
            })
            .on("click", function(d) {
                that.clickMap(this);
                that.select(d.properties.id);

/*                    if(!d3.select(this).classed('selected')) {


                    svg.selectAll(".region").classed('selected',false).classed('unselected',true).transition(100)
                        .style("fill",'#FFF');
                    d3.select(this).transition(100).style('fill','red');  

                    var id = d.properties.id;
                    d3.select(this).classed('selected', true);
                    MapasChile.select(id);
                }*/
            })
            .on("mouseover", function(d) {
                if(!d3.select(this).classed('selected')) {
                    d3.select(this).transition(100).style('fill','red');
                }
                that.showTooltip(d);
            })
            .on("mouseout", function(d) {
                if(!d3.select(this).classed('selected')) {
                    var unselected = d3.select(this).classed('unselected');
                    d3.select(this).transition(100)
                    .style("fill",function(d){
                        if(unselected){
                           return '#FFF'; 
                        }
                        var value = that.getRegion(d.id);
                        return that.quantize(value.conformado_porcentaje);
                    }); 
                }
                that.hideTooltip(d);
            })
            .each(function(d){
                var element = d3.select(this).node(),
                    bbox = element.getBBox();
                
                var xValue = bbox.x;
                switch(d.id){
                    case 5:
                        xValue = bbox.x-10;
                    break;
                    case 10:
                        xValue = bbox.x-30;
                    break;
                }

                that.dotsData.push( {id:d.id, x: xValue + bbox.width/2, y: bbox.y + bbox.height/2 } );
            });

        var dot = dotsGroup.selectAll(".centro")
            .data(that.dotsData)
            .attr("class", function(d) { return "centro " + d.id; })
            .enter()
            .append("circle")
            .attr("id", function(d) { return "centro-" + d.id; })
            .attr("r", 0)
            .attr("cx", function(d){
                return d.x;
            })
            .attr("cy", function(d){return d.y;})
            .style("pointer-events","none")
            .style("fill","#000");  

        var lines = linesGroup.selectAll(".lines")
                .data(that.dotsData)
                .attr("class", function(d) { return "lines " + d.id; })
                .enter()
                .append("line")
                .attr("id", function(d) { return "line-" + d.id; })
                .attr("x1", function(d){return d.x;})
                .attr("y1", function(d){return d.y;})
                .attr("x2", function(d){return d.x;})
                .attr("y2", function(d){return d.y;})
                .style("pointer-events","none")
                .attr("stroke-width", 1)
                .attr("stroke", "black");

/*            var voronoiPath = voronoiGroup.selectAll("path")
            .data(voronoi(points))
            .enter()
            .append("path")
            .style("fill", "red")
            .style("stroke", "#000")
            .attr("d", function(d) { 
                console.log(d);
                return "M" + d[0] + 'L' + d[0] + "Z"; 
            });*/

        var legend = d3.select('#legend ul')
            .attr('class', 'list-inline');

        var keys = legend.selectAll('li.key')
            .data(MapasChile.quantize.range());

        keys.enter().append('li')
            .attr('class', 'key')
            .style('background-color', String);


        function onresize(){
            var sizesNew = MapasChile.container.node().getBoundingClientRect();
            var widthNew = sizesNew.width;
            MapasChile.svg
                .attr("width", widthNew);

            back
                .attr("width", widthNew);
            
            projection
                .scale((widthNew/100)*130)
                .translate([widthNew / 2, height / 2]);

            regiones.attr("d", d3.geo.path().projection(projection));
        }

        window.onresize = onresize;
    

    };

    MapasChile.showTooltip = function(d){
        var that = this;
        var target = d3.select("#centro-"+d.id);
        var line = d3.select("#line-"+d.id);
        var value = that.getRegion(d.id);

        target.transition(100)
            .attr('r',5);
        
        line.style("opacity", 1)
            .transition(100)
            .attr("y1", function(d){
                var offset = (d.id==12)?95:70;
                return d.y - offset;
            });
        
        that.tip
            .show(value,target);

    };

    MapasChile.hideTooltip = function(d){
        var that = this;
        var target = d3.select("#centro-"+d.id);
        var line = d3.select("#line-"+d.id);

        line.transition(100)
            .attr("y1", function(d){return d.y;})
            .style("opacity", 0);
        
        target.transition(100).attr('r',0);

        that.tip.hide();

    };

    MapasChile.clickRegionText = function(d){
        var obj = MapasChile.svg.select('#region-'+d.codigo);
        MapasChile.clickMap(obj[0][0]);
        MapasChile.select(d.codigo);
    };

    MapasChile.clickMap = function(obj){
        if(!d3.select(obj).classed('selected')) {
            MapasChile.svg.selectAll(".region").classed('selected',false).classed('unselected',true).transition(100)
                .style("fill",'#FFF');
            d3.select(obj).transition(100).style('fill','red');  
            d3.select(obj).classed('selected', true);
        }
    };

    MapasChile.select = function(id){

        if(MapasChile.regiones){
    
            var selectedRegion = MapasChile.getRegion(id);

            MapasChile.binding.selected(selectedRegion);

            var comunas = MapasChile.comunas.filter(function(e){
                return parseInt(e.region) == parseInt(id);
            });

            comunas = _.sortBy(comunas, function(c) {
                          return c.nombre;
                        });

            MapasChile.binding.comunas([]);
            MapasChile.binding.comunas(comunas);
            
        }


    };

    MapasChile.getRegion = function(id){
        var region = _.first(
                MapasChile.regiones.filter(function(e){
                    return e.codigo == id;
                })
            );
        return region;
    };

    MapasChile.getRegionCenter = function(id){
        var center = _.first(
                MapasChile.dotsData.filter(function(e){
                    return e.id == id;
                })
            );
        return center;
    };

    MapasChile.unselect = function(){
        var that = this;
        MapasChile.binding.selected(false);
        MapasChile.container.select('svg').selectAll(".region").classed('selected',false).classed('unselected',false)
        .transition(100)
        .style('fill',function(d){
                        var value = that.getRegion(d.id);
                        return that.quantize(value.conformado_porcentaje);
                    });
        MapasChile.container.select('svg')
        .selectAll(".centro")
        .transition(100)
        .attr('r',0);

    };


})(window, document, jQuery, ko, _);

ko.extenders.numeric = function(target, precision) {
    var result = ko.computed({
        read: function() {
            return target().toFixed(precision); 
        },
        write: target 
    });

    result.raw = target;
    return result;
};


MapasChile.init();
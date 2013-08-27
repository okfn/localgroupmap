$(function(){

  var url = "https://docs.google.com/spreadsheet/pub?key=0AiWM2KV46Zt0dE1xWFptQ0JsQW1YQ2ZOdGlNU0J6MkE&single=true&gid=0&output=csv";

  var width = $(document).width(),
      mapWidth = Math.round(width * 0.8),
      height = $(document).height() - 10,
      centered;

  var rootsvg = d3.select("#svg").append("svg")
      .attr("width", width)
      .attr("height", height);

  rootsvg.append("rect")
      .attr("class", "background")
      .attr("width", width)
      .attr("height", height)
      .on("click", click);

  var svg = rootsvg.append("g")
      .attr("id", "world");

  var projection = d3.geo.equirectangular()
      .scale(120)
      .translate([mapWidth / 2, height / 2])
      .precision(0.1);

  var path = d3.geo.path()
      .projection(projection);

  var world, contacts, projects = {};

  d3.json("countries.topojson", function(error, w) {
    world = w;
    setup();
  });

  d3.csv(url, function(error, c) {
    contacts = c;
    setup();
  });

  var munge = function(str){
    return str.toLowerCase().replace(/\W/g, '-');
  };


  var setup = function() {
    if (!(world && contacts)) { return; }

    svg.selectAll('.country')
        .data(topojson.feature(world, world.objects.world).features)
      .enter().append("path")
        .attr("class", function(d) { return "country " + d.id; })
        .attr("d", path)
        .on("click", click);

    svg.append("path")
      .datum(topojson.mesh(world, world.objects.world, function(a, b) { return a !== b; }))
      .attr("d", path)
      .attr("class", "country-boundary");


    // svg.append('path')
    //   .datum(topojson.mesh(world, world.objects.world, function(a, b) { return a == b && a.properties.continent == 'Africa'; }))
    //     .attr("class", 'continent Africa')
    //     .attr("d", path);

    // svg.append('path')
    //   .datum(topojson.mesh(world, world.objects.world, function(a, b) { console.log(a, b); return (a == b || b.id === 'RUS') && a.properties.continent == 'Europe'; }))
    //     .attr("class", 'continent Europe')
    //     .attr("d", path);

    _.each(contacts, function(d, i){
      projects[d.ISO3] = projects[d.ISO3] || [];
      projects[d.ISO3].push(d);
      if (d.ISO3 === '') { return; }
      svg.selectAll('.' + d.ISO3).classed('oscountry', true);
      if (d['Geo coordinates']) {
        var latlng = d['Geo coordinates'].split(',');
        latlng = [parseFloat(latlng[1]), parseFloat(latlng[0])];
        var city = svg.append('g')
            .attr("class", "city city-" + d.ISO3 + " city-" + munge(d['Map location']))
            .attr("transform", function(d) { return "translate(" + projection(latlng) + ")"; });
        city.append('circle')
          .attr('class', 'dot')
          .attr('r', 1);
        city.append('circle')
          .attr('class', 'help-dot')
          .attr('r', 4);
      }
    });
    fillInContent();
  };

  var kScale = d3.scale.log()
    .domain([1, 800])
    .range([6, 1.5]);

  function click(d) {
    var x, y, k, xCenter;

    if (d && centered !== d) {
      var bounds = path.bounds(d);
      console.log(bounds);
      var countryHeight = Math.abs(bounds[0][1] - bounds[1][1]);
      var countryWidth = Math.abs(bounds[0][0] - bounds[1][0]);
      var maxDim = Math.max(countryWidth, countryHeight);
      console.log(maxDim);
      var centroid = path.centroid(d);
      x = centroid[0];
      y = centroid[1];
      xCenter = width * 1 / 3;
      k = kScale(maxDim);
      centered = d;
      svg.classed('zoomed', true);
      if (d.id && projects[d.id]) {
        svg.selectAll('.city').classed('active', false);
        svg.selectAll('.city-' + d.id).classed('active', true);
        svg.selectAll(".country")
            .classed("active-country", centered && function(d) { return d === centered; });
      } else {
        svg.selectAll(".country").classed('active-country', false);
        svg.selectAll(".city").classed('active', false);
      }
      fillInContent(d.id);
    } else {
      x = width / 2;
      xCenter = x;
      y = height / 2;
      k = 1;
      centered = null;
      svg.classed('zoomed', false);
      svg.selectAll(".country").classed('active-country', false);
      svg.selectAll(".city").classed('active', false);
      fillInContent();
    }

    svg.transition()
        .duration(500)
        .attr("transform", "translate(" + xCenter + "," + height / 2 + ")scale(" + k + ")translate(" + -x + "," + -y + ")")
        .style("stroke-width", 1.5 / k + "px");
  }

  var fillInContent = function(country) {
    var content = $('#content');
    content.off('mouseover', 'li.cityprop');
    content.html('');
    $('#geo').text('in ' + country);
    if (country && !projects[country]) {
      return;
    }
    if (!country) {
      country = '';
      $('#geo').text('internationally');
    } else {
      $('#geo').text('in ' + projects[country][0]['Country']);
    }
    _.each(projects[country], function(el){
      var attrs = {};
      if (el['Geo coordinates']) {
        attrs['class'] = 'cityprop';
        attrs['data-city'] = munge(el['Map location']);
      }
      content.append($('<li>', attrs).html(renderProject(el)));
    });
    content.on('mouseover', 'li.cityprop', function(){
      console.log('mouseover', $(this).data('city'));
      svg.selectAll('.city-' + $(this).data('city')).classed('activecity', true);
    });
    content.on('mouseout', 'li.cityprop', function(){
      svg.selectAll('.city-' + $(this).data('city')).classed('activecity', false);
    });
  };

  var isEmpty = function(n){
    return n === undefined || (/^([\- ]*|None)$/g).test(n);
  };

  var renderProject = function(project) {
    var geo = project['ISO3'] === '' ? project['Region'] : project['Map location'];
    var status = project['Local Groups status'];
    var topic = project['Topic'];
    var url = project['Website / Data in OpenSpending'];
    if (isEmpty(url)) { url = null; }
    if (url && !/^https?:\/\//.test(url)){
      url = 'http://' + url;
    }
    var org = project['Organisation / Event'];
    var name = project['Name of Project'];
    if (isEmpty(name)) { name = 'N/A'; }
    var html = '<dl>';
    var nameUrl;
    if (url){
      nameUrl = '<a href="' + url + '">' + name + '</a>';
    } else {
      nameUrl = name;
    }
    html += '<dt>Project name</dt><dd>' + nameUrl + '</dd>';
    html += '<dt>Geographic Context</dt><dd><strong>' + geo + '</strong></dd>';
    if (!isEmpty(org)){
      html += '<dt>Organisation / Event</dt><dd>' + org + '</dd>';
    }

    var twitter = project['Twitter handle'];
    if (!isEmpty(twitter)) {
      if (/^@/.test(twitter)) {
        twitter = twitter.substr(1);
      }
      html += '<dt>Twitter</dt><dd><a href="https://twitter.com/' + twitter + '">@' + twitter + '</a></dd>';
    }

    if (!isEmpty(topic)){
      html += '<dt>Topic</dt><dd>' + topic + '</dd>';
    }
    if (!isEmpty(status)){
      html += '<dt>Status</dt><dd>' + status + '</dd>';
    }
    html += '</dl>';
    return html;
  };

});
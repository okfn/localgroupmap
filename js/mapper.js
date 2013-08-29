$(function(){

  var url = "https://docs.google.com/spreadsheet/pub?key=0AiWM2KV46Zt0dE1xWFptQ0JsQW1YQ2ZOdGlNU0J6MkE&single=true&gid=0&output=csv";

  var width = $(window).width(),
      mapWidth = Math.round(width * 0.8),
      height = $(window).height() - 10,
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

  var world, contacts, projects = {}, topics = [], topicPrefix = 'Topic: ';

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

      if (topics.length === 0) {
        for (var key in projects[d.ISO3][0]) {
          if (key.indexOf(topicPrefix) === 0) {
            topics.push(key);
          }
        }
      }

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

    $topic = $('#topic');

    _.each(topics, function(d, i){
      var topicName = d.substring(topicPrefix.length)
      $topic.append($('<option>', {value: topicName}).text(topicName));
    });

    $topic.change(function(e){
      var selection = $topic.val();
      svg.selectAll('.country').classed('active-country', false);
      if (selection !== '') {
        _.each(projects, function(d, i){
          var countryCode = i;
          _.each(d, function(localGroup, j){
            for (var k in localGroup) {
              if (k.substring(topicPrefix.length) === selection && localGroup[k] === 'Y') {
                svg.selectAll('.' + countryCode).classed('active-country', true);
              }
            }
          });
        });
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
      var countryHeight = Math.abs(bounds[0][1] - bounds[1][1]);
      var countryWidth = Math.abs(bounds[0][0] - bounds[1][0]);
      var maxDim = Math.max(countryWidth, countryHeight);
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
      $('#intro').show();
      $('#country-info').hide();
      $('#topic').trigger('change');
    } else {
      $('#intro').hide();
      $('#country-info').show();
      $('#geo').text('Local Group in ' + projects[country][0]['Country']);
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
    var year = project['Established since'];
    var leaders = project['Community Leaders'];
    var lgprojects = project['Unique projects'];
    var url = project['Website'];
    if (isEmpty(url)) { url = null; }
    if (url && !/^https?:\/\//.test(url)){
      url = 'http://' + url;
    }
    // Mailing list column
    var mailmanurl = project['Mailing List'];
    if (mailmanurl && !/^https?:\/\//.test(mailmanurl)){
      mailmanurl = 'http://' + mailmanurl;
    }
    if (!isEmpty(mailmanurl)){
      mailmanurl = '<a href="' + mailmanurl + '">Subscribe here!</a>';
    }

    var org = project['Organisation / Event'];
    var name = project['Name of Project'];
    if (isEmpty(name)) { name = 'N/A'; }
    var html = '<dl>';
    url = '<a href="' + url + '">' + url + '</a>';
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

    var facebookurl = project['Facebook page'];
    if (facebookurl && !/^https?:\/\//.test(facebookurl)){
      facebookurl = 'http://' + facebookurl;
    }
    if (!isEmpty(facebookurl)){
      facebookurl = '<a href="' + facebookurl + '">Facebook</a>';
    }

    var youtubeurl = project['Youtube channel'];
    if (youtubeurl && !/^https?:\/\//.test(youtubeurl)){
      youtubeurl = 'http://' + youtubeurl;
    }
    if (!isEmpty(youtubeurl)){
      youtubeurl = '<a href="' + youtubeurl + '">Watch online</a>';
    }

    if (!isEmpty(year)){
      html += '<dt>Established since</dt><dd>' + year + '</dd>';
    }
    if (!isEmpty(status)){
      html += '<dt>Status</dt><dd>' + status + '</dd>';
    }
    if (!isEmpty(leaders)){
      html += '<dt>Community Leaders</dt><dd>' + leaders + '</dd>';
    }
    if (!isEmpty(url)){
      html += '<dt>Website</dt><dd>' + url + '</dd>';
    }
    if (!isEmpty(lgprojects)){
      html += '<dt>Unique projects</dt><dd>' + lgprojects + '</dd>';
    }
    if (!isEmpty(mailmanurl)){
      html += '<dt>Mailing List</dt><dd>' + mailmanurl + '</dd>';
    }
    if (!isEmpty(facebookurl)){
      html += '<dt>Facebook page</dt><dd>' + facebookurl + '</dd>';
    }
    if (!isEmpty(youtubeurl)){
      html += '<dt>Youtube channel</dt><dd>' + youtubeurl + '</dd>';
    }

    topicHtml = '<ul>';
    for (var i = 0; i < topics.length; i += 1) {
      if (project[topics[i]] === 'Y') {
        topicHtml += '<li>' + topics[i].substr(topicPrefix.length) + '</li>';
      }
    }
    topicHtml += '</ul>';
    html += '<dt>Topics</dt><dd>' + topicHtml + '</dd>';
    html += '</dl>';
    return html;
  };

});

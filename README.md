# OpenSpending Contacts Map

This is a d3.js map application of the OpenSpending Contacts around the world.

Embed like this:

    <iframe frameBorder="0" src="http://openspending.github.io/oscontactsmap/" width="940px" height="320px"></iframe>


### Create topojson data

Download natural earth data and then run:

    ogr2ogr -f GeoJSON world.json ne_50m_admin_0_countries/ne_50m_admin_0_countries.shp
    topojson --id-property iso_a3 -p name=NAME -p name -p continent -p subregion -p pop_est -p gdp_md_est -o countries.topojson world.json


Licensed under the BSD License.

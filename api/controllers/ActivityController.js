/**
 * ActivityController
 *
 * @description :: Server-side logic for managing activities
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

var moment = require("moment");


var days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
function weekday(number) {
    return days[number];
}

function displayedDuration(minutes) {
    if (minutes == 60) {
        return "1h";
    }
    if (minutes == 90) {
        return "1h30";
    }
    if (minutes == 120) {
        return "2h";
    }
    if (minutes == 150) {
        return "2h30";
    }
    if (minutes == 180) {
        return "3h";
    }

    return "" + minutes + "min";
}


var source = require("./pixelscamp.json");

var events = new Array(source.length);
var TZoffset = 1; // UTC+1 for Lisbon
source.forEach(function (item, index) {
    var event = {};
    event.id = item.UID;
    event.summary = item.SUMMARY;
    if (item.DESCRIPTION) {
        event.description = item.DESCRIPTION;
    }
    if (item.LOCATION) {
        event.location = item.LOCATION;
    }
    if (item.URL) {
        event.url = item.URL;
    }
    event.beginDate = new Date(item.DTSTART);
    var beginDateLocal = new Date(event.beginDate.getTime() + 3600000*TZoffset);
    event.beginDay = weekday(beginDateLocal.getDay());
    event.beginTime = moment(beginDateLocal).format("h:mmA");

    event.endDate = new Date(item.DTEND);
    var endDateLocal = new Date(event.endDate.getTime() + 3600000*TZoffset);
    event.endDay = weekday(endDateLocal.getDay());
    event.endTime = moment(endDateLocal).format("h:mmA");
    event.duration = displayedDuration((event.endDate.getTime() - event.beginDate.getTime()) / 1000 / 60);
    events[index] = event;
});


var sorted = events.sort(function (a, b) {
    // Turn your strings into dates, and then subtract them
    // to get a value that is either negative, positive, or zero.
    return a.startDate - b.startDate;
});


module.exports = {
    findAll: function (req, res) {
        return res.json(200, sorted);
    },

    findNext: function (req, res) {
        var now = new Date(Date.now());

        // set limit
        var limit = req.param('limit');
        if (!limit) {
            limit = 10;
        }

        var events = [];
        var found = 0;
        sorted.forEach(function (item) {
            if ((found < limit) && (item.beginDate > now)) {
                events.push(item);
                found++;
            }

        });

        return res.json(200, events);
    },

    findCurrent: function (req, res) {
        // check if there is a date specified
        var now = req.param('now');
        if (!now) {
            now = new Date(Date.now());
        }

        var events = [];
        sorted.forEach(function (item) {
            if ((now >= item.beginDate) && (now < item.endDate)) {
                events.push(item);
            }
        });

        return res.json(200, events);
    }
};










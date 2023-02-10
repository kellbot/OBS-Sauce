import * as sauce from '/shared/sauce/index.mjs';
import * as common from '/pages/src/common.mjs';


const doc = document.documentElement;
const L = sauce.locale;
const H = L.human;

let imperial = common.storage.get('/imperialUnits');
L.setImperial(imperial);

let gameConnection;

common.settingsStore.setDefault({
    autoscroll: true,
    refreshInterval: 2,
    overlayMode: false,
    rosterCount: 6,
    fontScale: 1,
    solidBackground: false,
    backgroundColor: '#222222',
    pzRangeDefinition: 'zwift',
    debugOn: false,
    tttMode: false,
    smoothCount: 3,
});


let ostrich = [
    { 'athleteId': 1354412, 'displayName': "J. Blackbourn", 'data': {} },
    { 'athleteId': 3478319, 'displayName': "Badger", 'data': {} },
    { 'athleteId': 3658694, 'displayName': "M. Brown", 'data': {} },
    //   {'athleteId': 408281, 'displayName' : "G.Jones" , 'data' : {}},
    { 'athleteId': 1331113, 'displayName': "J. Grant", 'data': {} },
    { 'athleteId': 1150050, 'displayName': "K. Orange", 'data': {} },
    { 'athleteId': 2570152, 'displayName': "S. Knowles", 'data': {} },

];

let hoss = [
    { 'athleteId': 508078, 'displayName': "", 'data': {} },
    { 'athleteId': 3429938, 'displayName': "", 'data': {} },
    { 'athleteId': 3109924, 'displayName': "", 'data': {} },
    { 'athleteId': 5507994, 'displayName': "", 'data': {} },
    { 'athleteId': 3478319, 'displayName': "", 'data': {} },
    { 'athleteId': 52227, 'displayName': "", 'data': {} },
]
    ;

let team = hoss;

let knownCourses = {

    46799750:
        [{ 'start': 8200, 'end': 8800 }],

    1234567:
        [{ 'start': 3600, 'end': 3900 }, { 'start': 8700, 'end': 9000 }],

    620436060: [{ 'start': 2300, 'end': 2700 }, { 'start': 3700, 'end': 4900 }],

}

let currentRoute;
let nearbyData;
let debugOn;
let tbody;
let lastUpdated = 0;
let ttt_mode;
let pzMode;
let leader_distance; //used in TTT mode
let activeRider;

let myChart;

var GradientBgPlugin = {
    beforeDraw: function(chart) { createGradient(chart); }
};

function createGradient(chart) {
    const ctx = chart.ctx;
    const canvas = chart.canvas;
    const chartArea = chart.chartArea;

    const minY = chart.scales.y.min;
    const maxY = chart.scales.y.max;
    const ftp = activeRider.athlete.ftp;
    let zones;

    if (pzMode == 'coggan'){

        zones = [
            {color: "#666666", max: 55}, //gray
            {color: "#3783FF", max: 75}, //blue
            {color: "#4DE94C", max: 90}, //green
            {color: "#FFEE00", max: 105}, //yellow
            {color: "#FF8C00", max: 120}, //orange
            {color: "#FC0000", max: 150}, //red
            {color: "#ffffff", max: 300} //purple
        ]
    } else {
        
        zones = [
            {color: "#666666", max: 60}, //gray
            {color: "#3783FF", max: 75}, //blue
            {color: "#4DE94C", max: 89}, //green
            {color: "#FFEE00", max: 104}, //yellow
            {color: "#FF8C00", max: 118}, //orange
            {color: "#FC0000", max: 300}, //red
        ]
    }


    // Chart background
    
    let range = maxY - minY;
    

    var gradientBack = canvas.getContext("2d").createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
    for (let i = 0; i <  zones.length ; i++){
        let zone = zones[i];
        let maxWatts = zone.max / 100 * ftp; //the wattage at the top of this zone
        let minWatts = (i == 0) ? 0 : (zones[i-1].max)/100 * ftp;



        if (maxWatts < minY || minWatts > maxY) continue; //if this number isn't on the chart go to the next zone
        if (minWatts < minY) minWatts = minY;
        if (maxWatts > maxY) maxWatts = maxY;
        
        let scaledMin = (minWatts -  minY) / range; //where this number falls in the box
        let scaledMax = (maxWatts -  minY) / range; //where this number falls in the box
        
        let stopMin  = scaledMin; // we want to go from bottom to top
        let stopMax  = scaledMax; 
        //console.log(`Zone ${i+1} Min: ${minWatts} - ${scaledMin} Max:  ${maxWatts} ${scaledMax}`);
        gradientBack.addColorStop(stopMin, zone.color);
        gradientBack.addColorStop(stopMax, zone.color);



        
    }

    ctx.fillStyle = gradientBack;
    ctx.fillRect(chartArea.left, chartArea.bottom,
        chartArea.right - chartArea.left, chartArea.top - chartArea.bottom);

}

const config = {
    type: 'line',
    data: {
        datasets: [
            {
                label: 'Power Output',
                borderColor: '#333333',
                data: [],

                pointRadius: 0,
                cubicInterpolationMode: 'monotone',
            },
            {
                label: 'FTP',
                borderColor: '#FFFFFF',
                pointRadius: 0,
                data: [],
                borderDash: [4, 4],
                borderWidth: 2
            }
        ]
    },
    options: {
        plugins: {
            streaming: {
                frameRate: 5   // chart is drawn 1 times every second
            },
            legend: {
                display: false,
            }
        },
        scales: {
            x: {
                type: 'realtime',
                display: false,
                realtime: {
                    delay: 2000,
                    refresh: 2000,
                    duration: 1000 * 60 * 3,
                    onRefresh: chart => {
                        chart.data.datasets[0].data.push({
                                x: Date.now(),
                                y: activeRider.state.power,
                                borderColor: 'rgb(54, 162, 235)',
                            });
                        chart.data.datasets[1].data = [
                            {
                                x: Date.now() - 1000 * 60 * 3,
                                y: activeRider.athlete.ftp,
                            },
                            {
                            x: Date.now(),
                            y: activeRider.athlete.ftp,
                        }];
                        createGradient(chart);
                    }
                }
            },
            y: {
                suggestedMin: 160,
                suggestedMax: 220,
                grid: {
                    display: false
                },
                title: {
                    text: 'watts',
                    display: true
                }
            }
        },

        maintainAspectRatio: false,
    },
    plugins: [
        GradientBgPlugin]
};



function makeLazyGetter(cb) {
    const getting = {};
    const cache = new Map();

    return function getter(key) {
        if (!cache.has(key)) {
            if (!getting[key]) {
                getting[key] = cb(key).then(value => {
                    cache.set(key, value || null);
                    if (!value) {
                        // Allow retry, especially for event data which is wonky
                        setTimeout(() => cache.delete(key), 10000);
                    }
                    delete getting[key];
                });
            }
            return;
        } else {
            return cache.get(key);
        }
    };
}

const lazyGetSubgroup = makeLazyGetter(id => common.rpc.getEventSubgroup(id));

function getEvent(state) {
    if (state.eventSubgroupId) {
        const sg = lazyGetSubgroup(state.eventSubgroupId);

        if (sg) return sg;

    }

    return false;
}

const _fetchingRoutes = new Map();
async function getRoute(id) {
    if (!_fetchingRoutes.has(id)) {
        _fetchingRoutes.set(id, common.rpc.getRoute(id));
    }
    return await _fetchingRoutes.get(id);
}

function toHoursAndMinutes(totalSeconds) {
    const absSeconds = Math.abs(totalSeconds);
    const totalMinutes = Math.floor(absSeconds / 60);

    const seconds = Math.floor(absSeconds % 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const negative = (totalSeconds < 1) ? '-' : '';

    return { h: hours, m: minutes, s: seconds, n: negative};
}

function renderStats(watching) {
    if (debugOn) console.log(watching);
    const hrvalue = watching.state.heartrate;
    const ftp = watching.athlete.ftp;
    const power = watching.state.power;
    const draft = watching.state.draft;



    if (!myChart) {
        myChart = new Chart(
            document.getElementById('powerchart'),
            config
        );
    }

    myChart.options.scales.y.suggestedMin = watching.athlete.ftp * 0.5;
    myChart.options.scales.y.suggestedMax = watching.athlete.ftp * 1.2;

    //refresh these things less often
    let refreshInterval = common.settingsStore.get('refreshInterval');
    if (Date.now() - lastUpdated > refreshInterval) {
        lastUpdated = Date.now();
        let worldDesc;
        //event info
        let eventTitle = doc.querySelector('#event-name').innerHTML;
        if (watching.state.eventSubgroupId) {
            let event = getEvent(watching.state)
            if (debugOn) console.log(event);
            currentRoute = event.route;
            eventTitle = event.name;

            //overlay for courses we know about
            if (currentRoute && currentRoute.id in knownCourses) {
                let leadInPCT = event.route.leadinDistanceInMeters / event.route.distanceInMeters * 100;
                let lapPCT = (100 - leadInPCT) / event.laps;

                let segments = [];

                let sprintData = knownCourses[currentRoute.id];
                let sprints = [];
                sprintData.forEach(data => {
                    for (let i = 0; i < event.laps; i++) {

                        sprints.push({ 'start': data.start + event.route.distanceInMeters * (i), 'end': data.end + event.route.distanceInMeters * (i) });
                    }
                });
                sprints.sort((a, b) => a.start - b.start);
                if (debugOn) console.log(sprints);

                if (leadInPCT > 0) {
                    let segment = leadInPCT;
                    segments.push(segment);
                }
                for (let i = 0; i < event.laps; i++) {
                    let segment = lapPCT;
                    segments.push(segment);
                }
                const trackOverlay = doc.querySelector('#lap .meter .segments');
                //Create the gradient
                let barColor = '#008DE300';

                let gradient = `linear-gradient(to right, ${barColor} 0%`;
                for (let i = 0; i < segments.length; i++) {
                    gradient += `,${barColor} ${segments[i]}%, #FFFFFF55 ${segments[i]}% ${segments[i] + 1}%, ${barColor} ${segments[i] + 1}%`;
                }
                gradient += `)`;

                let sprintOverlay = `linear-gradient(to right, ${barColor} 0%`;
                for (let i = 0; i < sprints.length; i++) {
                    let sprint = sprints[i];
                    let startRoutePCT = leadInPCT + sprint.start / (event.route.distanceInMeters * event.laps) * 100;
                    let startPCT = startRoutePCT;
                    let endRoutePCT = leadInPCT + sprint.end / (event.route.distanceInMeters * event.laps) * 100;
                    let endPCT = endRoutePCT;

                    sprintOverlay += `,${barColor} ${startPCT}%, #55555555 ${startPCT}% ${endPCT}%, ${barColor} ${endPCT}%`;

                }
                sprintOverlay += `)`;

                trackOverlay.style.backgroundImage = gradient + ', ' + sprintOverlay;
            }
            let courseId = watching.state.courseId;

            worldDesc = common.courseToNames[courseId] + ": " + event.route.name;


        } else {
            let courseId = watching.state.courseId;

            worldDesc = common.courseToNames[courseId];

            let route = getRoute(watching.state.eventSubgroupId);
            if (route.name) worldDesc += ": " + route.name;
        }


        doc.querySelector('#event-name').innerHTML = eventTitle;

        doc.querySelector('#course-name').innerHTML = worldDesc;// + ": " + route.name;
    }

    let riderTime = toHoursAndMinutes(watching.state.time);
    let courseProgress = watching.state.progress * 100;

    doc.querySelector('#timer .section').innerHTML =
        riderTime.h + ":" + riderTime.m.toString().padStart(2, 0) + ":" + riderTime.s.toString().padStart(2, 0);


    doc.querySelector('#lap .track').style.width = courseProgress + "%";
    doc.querySelector('#lap .trackLabel').innerHTML = (watching.state.distance / 1000).toFixed(2) + " km";
    doc.querySelector('#current-hr').innerHTML = hrvalue;
    doc.querySelector('#current-power').innerHTML = power;
    doc.querySelector('#current-draft').innerHTML = draft + "%";
    if (watching.stats.speed.smooth[60]) doc.querySelector('#speed-1m').innerHTML = watching.stats.speed.smooth[60].toFixed(1);
    if (watching.stats.speed.avg) doc.querySelector('#speed-a').innerHTML = watching.stats.speed.avg.toFixed(1);


    if (debugOn) console.log(watching);
}

export async function main() {

    //common.initInteractionListeners();
    let settings = common.settingsStore.get();

    debugOn = common.settingsStore.get('debugOn');

    let refresh;
    const setRefresh = () => {
        refresh = (1) * 1000 - 100; // within 100ms is fine.
    };


    common.settingsStore.addEventListener('changed', ev => {
        const changed = ev.data.changed;
        if (changed.has('/imperialUnits')) {
            L.setImperial(imperial = changed.get('/imperialUnits'));
        }
        //render();
    });

    console.log("Sauce Version:", await common.rpc.getVersion());

    const gcs = await common.rpc.getGameConnectionStatus();
    gameConnection = !!(gcs && gcs.connected);

    let athleteId;

    common.subscribe('athlete/watching', watching => {
        if (watching.athleteId !== athleteId) {
            athleteId = watching.athleteId;
        }
        activeRider = watching;
        if( watching.athlete ) renderStats(watching);

    });

    ttt_mode = common.settingsStore.get('tttMode');
    pzMode = common.settingsStore.get('pzRangeDefinition');
    //Mark the team
    if (ttt_mode) {
        for (const i in team) {
            let teammateId = team[i].athleteId;
            const teammate = await common.rpc.getAthlete(teammateId, { refresh: true });
            if (debugOn) console.log(teammate);
            if (teammate) await common.rpc.updateAthlete(teammateId, { marked: true });
        }
    }

    setRefresh();
    let lastRefresh = 0;
    common.subscribe('nearby', data => {
        if (ttt_mode) {
            data = data.filter(x => x.watching || (x.athlete && x.athlete.marked));
        }
        nearbyData = data;
        const elapsed = Date.now() - lastRefresh;
        if (elapsed >= refresh) {
            lastRefresh = Date.now();
            renderRoster(data);
        }

    });


}


function updateRow(rider) {
    let gap_raw;
    let gap_string;
    let distance_string;

    gap_raw = rider.gap;

    let gap = toHoursAndMinutes(rider.gap);

    //the idea here was to show rider spacing but it doesn't work very well
    if (ttt_mode && Number.isInteger(leader_distance) && Number.isInteger(rider.state.distance)) {
        distance_string = `${Math.abs(leader_distance - rider.state.distance).toString().padStart(3, "\u00A0")}m`;
        leader_distance = rider.state.distance
    }

    gap_string = `${gap.n}${gap.m}:${gap.s.toString().padStart(2, 0)}`;



    let nameString;
    if (rider.athlete) nameString = '<td class="name">' + rider.athlete.fullname.substring(0, 20) + "</td>";
    //let placeString = '<td></td>';
    // if (rider.state.eventSubgroupId) {
    //     placeString = '<td class="event-place">' + rider.eventPosition + '</td>';
    // }
    let html = `<tr>${nameString}<td class='monotime'>${gap_string}</td><td class='draft monotime'>${rider.state.draft}%</td></tr>`;
    return html;
}

let frames = 0;
function renderRoster(data) {
    tbody = doc.querySelector('#roster-table tbody');
    let riders;

    data.sort((a, b) => a.distance - b.distance);
    const centerIdx = data.findIndex(x => x.watching); //find where we are in the data
    if (ttt_mode) {
        riders = data;
    } else {
        let rosterCount = common.settingsStore.get('rosterCount');
        let above = Math.ceil(rosterCount / 2);
        let below = rosterCount - above;
        riders = data.slice(centerIdx - above, centerIdx + below); //get athletes on either side of us
    }

    if (riders.length > 1) leader_distance = riders[0].state.distance;

    //Would be nice to update rather than nuke this
    if (riders.length > 0) {
        tbody.innerHTML = '';
        for (let i = 0; i < riders.length; i++) {
            let rider = riders[i];
            const tr = document.createElement('tr');
            tr.innerHTML = updateRow(rider);
            tbody.appendChild(tr);
        }
    }



}


export async function settingsMain() {
    common.initInteractionListeners();
    await common.initSettingsForm('form')();
    //await initWindowsPanel();
}
import * as sauce from '/shared/sauce/index.mjs';
import * as common from '/pages/src/common.mjs';
import{  renderNotes } from './course-notes.mjs';


const doc = document.documentElement;
const trackOverlay = doc.querySelector('#lap .meter .segments');
const timer = doc.querySelector('#timer');
const nameDiv = doc.querySelector('#name');
const newTeamDiv = doc.querySelector('#new-team');
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
    pzRangeDefinition: 'zwift',
    debugOn: false,
    tttMode: false,
    teams: {},
    teamSelect: null,
    rosterData1: 'gap',
    rosterData2: 'draft',
    saveProgress: false,
    currentProgress: 0,
});


let team;

let knownCourses = {

    46799750: //rolling highlands
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

function parseDelimitedString(str) {
    // check if the string is comma delimited
    if (str.includes(',')) {
      // remove any spaces from the string
      str = str.replace(/\s/g, '');
  
      // split the string into an array using the comma as a delimiter
      const strArray = str.split(',');
  
      // use the Array.map() method to convert each string element to an integer
      const intArray = strArray.map(str => parseInt(str));
  
      return intArray;
    }
    // check if the string is space delimited
    else if (str.includes(' ')) {
      // split the string into an array using the space as a delimiter
      const strArray = str.split(' ');
  
      // use the Array.map() method to convert each string element to an integer
      const intArray = strArray.map(str => parseInt(str));
  
      return intArray;
    }
    // if the string is not delimited, assume it is a single integer value
    else {
      return [parseInt(str)];
    }
}

function removeNonLetters(str) {
    // remove any non-letter characters with a hyphen
    const newStr = str.replace(/[^a-zA-Z]/g, '-');
  
    return newStr;
  }

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

async function renderStats(watching) {

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
    if (!refreshInterval) refreshInterval = 2;

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

            if(event.route) worldDesc = common.courseToNames[courseId] + ": " + event.route.name;


        } else {
            let courseId = watching.state.courseId;

            worldDesc = common.courseToNames[courseId];

            let route = await getRoute(watching.state.eventSubgroupId);
            if (route) worldDesc += ": " + route.name;
        }


        doc.querySelector('#event-name').innerHTML = eventTitle;

        doc.querySelector('#course-name').innerHTML = worldDesc;// + ": " + route.name;
    }

    let riderTime = toHoursAndMinutes(watching.state.time);
    let courseProgress = watching.state.progress * 100;

    timer.innerHTML =
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
    common.initInteractionListeners();
    console.log("Sauce Version:", await common.rpc.getVersion());


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
        if (changed.has('tttMode')) {
            ttt_mode = changed.get('tttMode');
        }
    });


    const gcs = await common.rpc.getGameConnectionStatus();
    gameConnection = !!(gcs && gcs.connected);

    let athleteId;

    common.subscribe('athlete/watching', watching => {
        if (watching.athleteId !== athleteId) {
            athleteId = watching.athleteId;
            
            nameDiv.innerHTML = watching.athlete.fullname.substring(0,20);
            if (debugOn) console.log(watching);
        }
        activeRider = watching;
        if( watching.athlete ) {
            renderStats(watching);
            renderNotes(watching);
        }

    });

    ttt_mode = common.settingsStore.get('tttMode');
    pzMode = common.settingsStore.get('pzRangeDefinition');


    setRefresh();
    let lastRefresh = 0;
    common.subscribe('nearby', data => {
        if (ttt_mode) {
            if (settings.teamSelect) {
                let team = settings.teams[settings.teamSelect];
                
                data = data.filter(x => x.watching || (x.athlete && team.roster.includes(x.athlete.id) ));
            } else {
                data = data.filter(x => x.watching || (x.athlete && x.athlete.marked));
            }
        }
        nearbyData = data;
        const elapsed = Date.now() - lastRefresh;
        if (elapsed >= refresh) {
            lastRefresh = Date.now();
            renderRoster(data);
        }

    });


}
function getTeam(teamSlug) {
    let teams = common.settingsStore.get('teams');
    return teams[teamSlug];
}
function saveTeam(teamName, rosterArr) {
    let teams = common.settingsStore.get('teams');
    if(!teams) teams = {};
    let team_slug = removeNonLetters(teamName);
    let newTeam = {name: teamName, roster: rosterArr};
    teams[team_slug] = newTeam;
    common.settingsStore.set('teams', teams);
}

async function renderTeamsList(){
    const teamSelect = document.querySelector('select[name="teamSelect"]');
    teamSelect.options.length = 0; //reset the selector
    
    const teamTable = document.getElementById('teams');
    let teams = common.settingsStore.get('teams');
    console.log(teams);
    
    //remove all rows except header
    for (let i = teamTable.rows.length - 1; i > 0; i--) {
        teamTable.deleteRow(i);
    }

    for (team in teams){
        let teamSlug = removeNonLetters(teams[team].name);
        const teamRow = teamTable.insertRow();
        const nameCell = teamRow.insertCell();
        nameCell.innerHTML = teams[team].name;
        nameCell.classList = 'team-name';

        //add it to the select as well
        
        const teamOption = document.createElement("option");
        teamOption.text = teams[team].name;
        teamOption.value = teamSlug;
        if (teamSlug == common.settingsStore.get('teamSelect')) teamOption.selected = true;
        
        teamSelect.add(teamOption);
        
        const rosterCell = teamRow.insertCell();
        

        const trashCell = teamRow.insertCell();
        trashCell.innerHTML = `<a class="link danger team-delete" data-team="${teamSlug}"><ms>delete_forever</ms></a>`;
        trashCell.classList = 'btn';
        const editCell = teamRow.insertCell();
        editCell.innerHTML = `<a class="link team-edit title="Edit team" data-team="${teamSlug}"><ms>edit</ms></a>`;
        // let rosterNames = [];
        // let roster = teams[team].roster.filter((value) => value !== null);
        //This is cool but ugly and slow
        // for(let i = 0; i < roster.length; i++){
        //     let athlete;
        //     try {
        //         athlete = await common.rpc.getAthlete(roster[i], {refresh: true});
                
        //        rosterNames.push(athlete.fullname);
        //     } catch {
        //         console.log(`Error with athleteId ${roster[i]}`);
        //     }
        // }
        rosterCell.classList = 'team-roster';
        rosterCell.innerHTML = `${teams[team].roster.length} members`;
    }

}

async function initTeamsPanel() {
    document.addEventListener('click', async ev => {
        const btn = ev.target.closest('.button[data-action]');
        if (!btn) {
            return;
        }
        if (btn.dataset.action === 'team-create') { //show the team form
           newTeamDiv.style.display = 'block';
           
           document.querySelector('.action-buttons').style.display = 'none';
        } 
        if (btn.dataset.action === 'team-cancel' ) { //hide the team form
            newTeamDiv.style.display = 'none';
            document.querySelector('.action-buttons').style.display = 'block';
        }
        if (btn.dataset.action === 'team-save' ) {
            let teamName = document.querySelector("input[name='teamName']").value;
            let rosterString = document.querySelector("input[name='teamIds']").value;
            let roster = parseDelimitedString(rosterString);
            saveTeam(teamName, roster);
            newTeamDiv.style.display = 'none';
            document.querySelector('.action-buttons').style.display = 'block';
     
            await renderTeamsList();
    
        }
    });
    document.addEventListener('click', async ev => {
        const link = ev.target.closest('table a.link');
        if (!link) {
            return;
        }
        if (link.classList.contains('team-delete')) {
            let teamSlug = link.getAttribute('data-team');
            let teams = common.settingsStore.get('teams');
            delete teams[teamSlug];
            common.settingsStore.set('teams', teams);
        } else if (link.classList.contains('team-edit')) {
            const teamRow = ev.target.closest('tr');
            let teamSlug = link.getAttribute('data-team');
            let team = getTeam(teamSlug);
            document.querySelector("input[name='teamName']").value = team.name;
            let teamIdDiv = document.querySelector("input[name='teamIds']");
            teamIdDiv.value = team.roster.join(', ');
            teamIdDiv.style.width = (team.roster.length * 75) + 'px';
            newTeamDiv.style.display = 'block';
            document.querySelector('.action-buttons').style.display = 'none';

        }

        await renderTeamsList();
        
    });
    await renderTeamsList();
}

function updateRow(rider) {
    if (!rider.athlete) return;

    let row = document.createElement("tr");

    let nameCell = row.insertCell();
    nameCell.classList = 'name';
    nameCell.innerHTML = rider.athlete.fLast.substring(0, 20);
    
    let columns = ['rosterData1', 'rosterData2'];
    for (let i = 0; i < columns.length; i++){
        let stat = common.settingsStore.get(columns[i]);
        let heading = document.querySelector('#' + columns[i]);

        let cell = row.insertCell();
        cell.classList = `monotime ${stat}`;
        heading.innerHTML = stat;
        if (stat == 'gap') {       
            let gap = toHoursAndMinutes(rider.gap);
            cell.innerHTML = `${gap.n}${gap.m}:${gap.s.toString().padStart(2, 0)}`;
        } else if (stat == 'draft') {
            cell.innerHTML = rider.state.draft;
        } else if (stat == 'speed') {
            cell.innerHTML = rider.state.speed.toFixed(1);
        }
        

    }
    return row;
}

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
            let row = updateRow(rider);
            tbody.appendChild(row);
        }
    }



}


export async function settingsMain() {
    common.initInteractionListeners();
    await common.initSettingsForm('form')();
    await initTeamsPanel();
    if (!window.isElectron) { 
        const close = document.querySelector('#titlebar .button.close');
        if (close) {
            close.addEventListener('click', ev => history.back());
        }
    }
}
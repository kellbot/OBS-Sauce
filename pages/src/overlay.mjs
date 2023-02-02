import * as sauce from '/shared/sauce/index.mjs';
import * as common from '/pages/src/common.mjs';


const doc = document.documentElement;
let gameConnection;


let team = [
    {'athleteId': 1354412, 'displayName' : "J. Blackbourn" , 'data' : {}},
    {'athleteId': 3658694, 'displayName' : "M. Brown" , 'data' : {}},
    {'athleteId': 408281, 'displayName' : "G.Jones" , 'data' : {}},
    {'athleteId': 1331113, 'displayName' : "J. Grant" , 'data' : {}},
    {'athleteId': 1150050, 'displayName' : "K. Orange" , 'data' : {}},
]

let sandbox = true;
let nearbyData;
let lastRefresh;
let tbody;
let lastUpdated = 0;


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
const lazyGetRoute = makeLazyGetter(id => common.rpc.getRoute(id));

function getRoute(state) {
    if (state.eventSubgroupId) {
        const sg = lazyGetSubgroup(state.eventSubgroupId);
        if (sg) {
            return {route: sg.route, laps: sg.laps};
        }
    } else if (state.routeId) {
        return {route: lazyGetRoute(state.routeId), laps: 0};
    }
    return {};
}

function getEvent(state) {
    if (state.eventSubgroupId) {
        const sg = lazyGetSubgroup(state.eventSubgroupId);
        if (sg) return sg;
    }
    return false;
}

function toHoursAndMinutes(totalSeconds) {
    const totalMinutes = Math.floor(totalSeconds / 60);
  
    const seconds = Math.abs(Math.floor(totalSeconds % 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
  
    return { h: hours, m: minutes, s: seconds };
}
  
function renderStats(watching){
    const hrvalue = watching.state.heartrate;
    const ftp = watching.athlete.ftp;
    const power = watching.state.power;
    const draft = watching.state.draft;
    

    //refresh these things less often
    let refreshInterval = 9900;
    if (Date.now() - lastUpdated > refreshInterval){
        lastUpdated = Date.now();
        let worldDesc; 
        //event info
        let eventTitle = doc.querySelector('#event-info .infolabel').innerHTML;
        if (watching.state.eventSubgroupId) {
            let event = getEvent(watching.state)
            eventTitle = event.name;
            let leadInPCT = event.route.leadinDistanceInMeters / event.route.distanceInMeters * 100;
            let lapPCT = (100 - leadInPCT) / event.laps;
            
            let segments = [];

            let sprintData = [{'start': 3600, 'end': 3900},{'start': 8700, 'end':9000}];
            let sprints = [];
            sprintData.forEach(data => {
                for(let i = 0; i < event.laps; i++ ){

                    sprints.push({'start' : data.start + event.route.distanceInMeters * (i), 'end':data.end + event.route.distanceInMeters * (i) });
                }
            });
            sprints.sort((a,b) => a.start - b.start);
            console.log(sprints);

            if (leadInPCT > 0) {
                let segment = leadInPCT;
                segments.push(segment);
            }
            for (let i = 0; i < event.laps; i++){
                let segment = lapPCT;
                segments.push(segment);
            }
            const trackOverlay = doc.querySelector('#lap .meter .segments');
            //Create the gradient
            let barColor ='#008DE300';

            let gradient = `linear-gradient(to right, ${barColor} 0%`;
            for(let i = 0; i < segments.length; i++){
                gradient += `,${barColor} ${segments[i]}%, #FFFFFF55 ${segments[i]}% ${segments[i]+1}%, ${barColor} ${segments[i]+1}%`;
            }
            gradient += `)`;

            let sprintOverlay = `linear-gradient(to right, ${barColor} 0%`;
            for(let i = 0; i < sprints.length; i++){
                let sprint = sprints[i];
                let startRoutePCT = leadInPCT + sprint.start / (event.route.distanceInMeters * event.laps) * 100;
                let startPCT = startRoutePCT;
                let endRoutePCT = leadInPCT + sprint.end / (event.route.distanceInMeters * event.laps) * 100;
                let endPCT = endRoutePCT;
                
                sprintOverlay +=`,${barColor} ${startPCT}%, #55FF5555 ${startPCT}% ${endPCT}%, ${barColor} ${endPCT}%`;

            }
            sprintOverlay += `)`;

            trackOverlay.style.backgroundImage = gradient + ', ' + sprintOverlay;
            
            let courseId = watching.state.courseId;

            worldDesc = common.courseToNames[courseId] + ": " + event.route.name;


            console.log(event);

        } else {
            let courseId = watching.state.courseId;

            worldDesc = common.courseToNames[courseId];
    
            let route = getRoute(watching.state);
            if (route.name) worldDesc += ": " + route.name;
        }
        

        doc.querySelector('#event-info .infolabel').innerHTML = eventTitle;
        
        doc.querySelector('#course-name .scrollbox').innerHTML = worldDesc;// + ": " + route.name;
    }

    let riderTime = toHoursAndMinutes(watching.stats.elapsedTime);
    let courseProgress = watching.state.progress * 100;

    doc.querySelector('#timer .infolabel').innerHTML = 
        riderTime.h + ":" + riderTime.m.toString().padStart(2,0) + ":" + riderTime.s.toString().padStart(2,0);


    doc.querySelector('#lap .track').style.width = courseProgress + "%";
    doc.querySelector('#current-hr').innerHTML = hrvalue;
    doc.querySelector('#current-power').innerHTML =  power;
    doc.querySelector('#current-draft').innerHTML = draft + "%";

    //onsole.log(watching);
}

async function main() {
    let refresh;
    const setRefresh = () => {
        refresh = (5) * 1000 - 100; // within 100ms is fine.
    };
    
    console.log("Sauce Version:", await common.rpc.getVersion());
    
    const gcs = await common.rpc.getGameConnectionStatus();
    gameConnection = !!(gcs && gcs.connected);

    let athleteId;

    common.subscribe('athlete/watching', watching =>{
        if(watching.athleteId !== athleteId) {
            athleteId = watching.athleteId;
        }
        renderStats(watching);

    });

    setRefresh();
    let lastRefresh = 0;
    common.subscribe('nearby', data => {
        if (!sandbox) {
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


function updateRow(rider){
    let gap = toHoursAndMinutes(rider.gap);
    let nameString = '<td class="name">' + rider.athlete.fullname.substring(0,20)+ "</td>";
    let placeString = '<td></td>';
    if (rider.state.eventSubgroupId) {
        placeString = '<td class="event-place">' + rider.eventPosition + '</td>';
    }
    let html = `<tr>${placeString}${nameString}<td class='monotime'>${gap.m}:${gap.s.toString().padStart(2, 0)}</td><td class='draft monotime'>${rider.state.draft}%</td></tr>`;
    return html;
}

let frames = 0;
function renderRoster(data){
    tbody = doc.querySelector('#roster-table tbody'); 

    data.sort((a,b) => a.gap - b.gap);
    const centerIdx = data.findIndex(x => x.watching); //find where we are in the data
    let riders = data.slice(centerIdx-3, centerIdx+3); //get two on either side of us 

            //initial population
    if (tbody.querySelectorAll('tr').length < 1) {
        for (let i = 0; i < riders.length; i++) {
            let rider = riders[i];
            const tr = document.createElement('tr');
            tr.innerHTML = updateRow(rider);
             tbody.appendChild(tr);
        } 
    } else {
        let rows = tbody.querySelectorAll('tr');

        for(let i = 0; i < riders.length; i++){
            let rider = riders[i];
            if(i < rows.length) {
                rows[i].innerHTML = updateRow(rider);
            } else {
                const tr = document.createElement('tr');
                tr.innerHTML = updateRow(rider);
                tbody.appendChild(tr);
            }
        }
        
    }
   
}

main();
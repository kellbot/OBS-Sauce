import * as sauce from '/shared/sauce/index.mjs';
import * as common from '/pages/src/common.mjs';


const doc = document.documentElement;

let gameConnection;


let ostrich = [
    {'athleteId': 1354412, 'displayName' : "J. Blackbourn" , 'data' : {}},
    {'athleteId': 3478319, 'displayName' : "Badger" , 'data' : {}},
    {'athleteId': 3658694, 'displayName' : "M. Brown" , 'data' : {}},
//   {'athleteId': 408281, 'displayName' : "G.Jones" , 'data' : {}},
    {'athleteId': 1331113, 'displayName' : "J. Grant" , 'data' : {}},
    {'athleteId': 1150050, 'displayName' : "K. Orange" , 'data' : {}},
    {'athleteId': 2570152, 'displayName' : "S. Knowles" , 'data' : {}},

];

let hoss = [
    {'athleteId': 508078, 'displayName' : "" , 'data' : {}},
    {'athleteId': 3429938, 'displayName' : "" , 'data' : {}},
    {'athleteId': 3109924, 'displayName' : "" , 'data' : {}},
    {'athleteId': 5507994, 'displayName' : "" , 'data' : {}},
    {'athleteId': 3478319, 'displayName' : "" , 'data' : {}},
    {'athleteId': 52227, 'displayName' : "" , 'data' : {}},
]
;

let team = hoss;

let knownCourses = {
    
    46799750 : 
       [{'start': 8200, 'end': 8800}],
    
    1234567 : 
        [{'start': 3600, 'end': 3900},{'start': 8700, 'end':9000}],
    
    620436060 : [{'start': 2300, 'end': 2700},{'start': 3700, 'end':4900}],
    
}

let currentRoute;
let nearbyData;
let lastRefresh;
let tbody;
let lastUpdated = 0;
let ttt_mode = false;
let leader_distance; //used in TTT mode
let activeRider;

let myChart;

var GradientBgPlugin = {
    beforeDraw: function(chart, args, options) {
      const ctx = chart.ctx;
      const canvas = chart.canvas;
      const chartArea = chart.chartArea;
  
      // Chart background
      var gradientBack = canvas.getContext("2d").createLinearGradient(0, 0, 0, 255);
      gradientBack.addColorStop(0, "rgb(100, 53, 89)");
      gradientBack.addColorStop(0.07, "rgb(100, 53, 89)");
      gradientBack.addColorStop(0.07, "rgb(122, 65, 109)");
      gradientBack.addColorStop(0.30, "rgb(122, 65, 109)");
      gradientBack.addColorStop(0.30, "rgb(145, 77, 128)");
      gradientBack.addColorStop(0.52, "rgb(145, 77, 128)");
      gradientBack.addColorStop(0.52, "rgb(167, 89, 148)");
      gradientBack.addColorStop(0.75, "rgb(167, 89, 148)");
      gradientBack.addColorStop(0.75, "rgb(145, 77, 128)");
      gradientBack.addColorStop(0.96, "rgb(214, 178, 205)");
      gradientBack.addColorStop(0.96, "rgb(237, 222, 234)");
      gradientBack.addColorStop(1, "rgb(237, 222, 234)");
  
      ctx.fillStyle = gradientBack;
      ctx.fillRect(chartArea.left, chartArea.bottom,
        chartArea.right - chartArea.left, chartArea.top - chartArea.bottom);
    }
  };

const config = {
    type: 'line',
    data: {
      datasets: [
        {
          label: 'Power Output',
          borderColor: 'rgb(165, 165, 165)',
          data: [],
          
        pointRadius: 0,
        },
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
            
            duration: 1000 * 60 * 5,
            onRefresh: chart => {
              chart.data.datasets.forEach(dataset => {
                dataset.data.push({
                  x: Date.now(),
                  y: activeRider.state.power,
                  borderColor: 'rgb(54, 162, 235)',
                });
              });
            }
          }
        },
        y: {
            suggestedMin: 0,
            suggestedMax: 300
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
    const totalMinutes = Math.floor(totalSeconds / 60);
  
    const seconds = Math.abs(Math.floor(totalSeconds % 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
  
    return { h: hours, m: minutes, s: seconds };
}

function renderPZChart(statsObj){
    let bars = doc.querySelectorAll('#power-stats .graphbar');
    let data = statsObj.power.timeInZones;
    for(let i=0; i < data.length; i++ ){
        let zone = data[i];
        let mins = zone.time;
        let zonePCT = mins / statsObj.elapsedTime * 100;
        bars[i].style.height = zonePCT + "%";
        
    }
}
  
function renderStats(watching){
    console.log(watching);
    const hrvalue = watching.state.heartrate;
    const ftp = watching.athlete.ftp;
    const power = watching.state.power;
    const draft = watching.state.draft;
    

    
    if(!myChart) {
        myChart = new Chart(
            document.getElementById('powerchart'),
            config
        );
    }

    myChart.options.scales.y.suggestedMin = watching.athlete.ftp * 0.5;
    myChart.options.scales.y.suggestedMax = watching.athlete.ftp * 1.2;

    //refresh these things less often
    let refreshInterval = 9900;
    if (Date.now() - lastUpdated > refreshInterval){
        lastUpdated = Date.now();

        //powerzone stats info
        renderPZChart(watching.stats);

        let worldDesc; 
        //event info
        let eventTitle = doc.querySelector('#event-name').innerHTML;
        if (watching.state.eventSubgroupId) {
            let event = getEvent(watching.state)
            currentRoute = event.route;
            eventTitle = event.name;

            //overlay for courses we know about
            if(currentRoute && currentRoute.id in knownCourses ) {
                let leadInPCT = event.route.leadinDistanceInMeters / event.route.distanceInMeters * 100;
                let lapPCT = (100 - leadInPCT) / event.laps;
                
                let segments = [];

                let sprintData = knownCourses[currentRoute.id];
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
                    
                    sprintOverlay +=`,${barColor} ${startPCT}%, #55555555 ${startPCT}% ${endPCT}%, ${barColor} ${endPCT}%`;

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

    let riderTime = toHoursAndMinutes(watching.stats.elapsedTime);
    let courseProgress = watching.state.progress * 100;

    doc.querySelector('#timer .section').innerHTML = 
        riderTime.h + ":" + riderTime.m.toString().padStart(2,0) + ":" + riderTime.s.toString().padStart(2,0);


    doc.querySelector('#lap .track').style.width = courseProgress + "%";
    doc.querySelector('#lap .trackLabel').innerHTML = (watching.state.distance/1000).toFixed(2) + " km";
    doc.querySelector('#current-hr').innerHTML = hrvalue;
    doc.querySelector('#current-power').innerHTML =  power;
    doc.querySelector('#current-draft').innerHTML = draft + "%";
    if (watching.stats.speed.smooth[60]) doc.querySelector('#speed-1m').innerHTML = watching.stats.speed.smooth[60].toFixed(1);
    doc.querySelector('#speed-a').innerHTML = watching.stats.speed.avg.toFixed(1);


    //onsole.log(watching);
}

async function main() {
    let refresh;
    const setRefresh = () => {
        refresh = (1) * 1000 - 100; // within 100ms is fine.
    };
    
    console.log("Sauce Version:", await common.rpc.getVersion());
    
    const gcs = await common.rpc.getGameConnectionStatus();
    gameConnection = !!(gcs && gcs.connected);

    let athleteId;

    common.subscribe('athlete/watching', watching =>{
        if(watching.athleteId !== athleteId) {
            athleteId = watching.athleteId;
        }
        activeRider = watching;
        renderStats(watching);

    });

    //Mark the team
    for(const i in team ){
        let teammateId = team[i].athleteId;
        const teammate = await common.rpc.getAthlete(teammateId, {refresh: true});
        console.log(teammate);
        if (teammate) await common.rpc.updateAthlete(teammateId, {marked: true});
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


function updateRow(rider){
    let gap_raw;
    let gap_string;
    let distance_string;

    gap_raw = rider.gap;

    let gap = toHoursAndMinutes(rider.gap);
    if(Number.isInteger(leader_distance) && Number.isInteger(rider.state.distance)) {
        distance_string = `${Math.abs(leader_distance - rider.state.distance).toString().padStart(3, "\u00A0")}m`;
        leader_distance = rider.state.distance
    }

    gap_string = `${gap.m}:${gap.s.toString().padStart(2, 0)}`;

    

    let nameString = '<td class="name">' + rider.athlete.fullname.substring(0,20)+ "</td>";
    //let placeString = '<td></td>';
    // if (rider.state.eventSubgroupId) {
    //     placeString = '<td class="event-place">' + rider.eventPosition + '</td>';
    // }
    let html = `<tr>${nameString}<td class='monotime'>${gap_string} ${distance_string}</td><td class='draft monotime'>${rider.state.draft}%</td></tr>`;
    return html;
}

let frames = 0;
function renderRoster(data){
    tbody = doc.querySelector('#roster-table tbody'); 
    let riders;

        data.sort((a,b) => a.distance - b.distance);    
        const centerIdx = data.findIndex(x => x.watching); //find where we are in the data
        if (ttt_mode) {
            riders = data;          
        } else {
            riders = data.slice(centerIdx-3, centerIdx+3); //get two on either side of us 
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

main();
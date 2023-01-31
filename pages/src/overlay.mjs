import * as common from '/pages/src/common.mjs';


const doc = document.documentElement;
let gameConnection;

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

function toHoursAndMinutes(totalSeconds) {
    const totalMinutes = Math.floor(totalSeconds / 60);
  
    const seconds = Math.abs(Math.floor(totalSeconds % 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
  
    return { h: hours, m: minutes, s: seconds };
  }

async function main() {
    console.log("Sauce Version:", await common.rpc.getVersion());
    
    const gcs = await common.rpc.getGameConnectionStatus();
    gameConnection = !!(gcs && gcs.connected);

    let athleteId;

    common.subscribe('athlete/watching', watching =>{
        if(watching.athleteId !== athleteId) {
            athleteId = watching.athleteId;
        }
    
        const hrvalue = watching.state.heartrate;
        const ftp = watching.athlete.ftp;
        const power = watching.state.power;
        const draft = watching.state.draft;
        
        let courseId = watching.state.courseId;

        let worldDesc = common.courseToNames[courseId];

        let route = getRoute(watching.state);
        if (route.name) worldDesc += ": " + route.name;

        let riderTime = toHoursAndMinutes(watching.stats.elapsedTime);

        doc.querySelector('#timer .infolabel').innerHTML = 
            riderTime.h + ":" + riderTime.m.toString().padStart(2,0) + ":" + riderTime.s.toString().padStart(2,0);


        doc.querySelector('#course-name .scrollbox').innerHTML = worldDesc;// + ": " + route.name;

        doc.querySelector('#current-hr').innerHTML = hrvalue;
        doc.querySelector('#current-power').innerHTML =  power;
        doc.querySelector('#current-draft').innerHTML = draft + "%";

    });



}

main();
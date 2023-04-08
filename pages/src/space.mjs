import * as sauce from '/shared/sauce/index.mjs';
import * as common from '/pages/src/common.mjs';


let gameConnection;
const doc = document.documentElement;
const body = doc.querySelector('body');

const gso = 35786000;
let lastHeight = 0;
let lastkJ = 0;

const findTime = (num) => {
        let seconds = Number(num);
        var y = Math.floor(seconds / (3600*24*365));
        var d = Math.floor(seconds % (3600*24*365) / (3600*24));
        var h = Math.floor(seconds % (3600*24) / 3600);
        var m = Math.floor(seconds % 3600 / 60);
        var s = Math.floor(seconds % 60);
 
        var yDisplay = y > 0 ? y + (y == 1 ? " year, " : " years, ") : "";
        var dDisplay = d > 0 ? d + (d == 1 ? " day, " : " days, ") : "";
        var hDisplay = h > 0 ? h + (h == 1 ? " hour, " : " hours, ") : "";
        var mDisplay = m > 0 ? m + (m == 1 ? " minute, " : " minutes, ") : "";
        var sDisplay = s > 0 ? s + (s == 1 ? " second" : " seconds") : "";
        return yDisplay + dDisplay + hDisplay + mDisplay + sDisplay;
    
 }

function calculateGravity(height) {
    let G = 6.6743 * Math.pow(10,-11);
    let M = 5.9722 * Math.pow(10,24); //mass of earth in kg
    let R = 6.371 * Math.pow(10,6); //radius of earth in m

    //G M / R^2
    let gravity = G * M / Math.pow(R + height, 2); 
    return gravity;
}

function calculateHeightGained(energykJ, masskg, gravity) {
    return (energykJ * 1000) / (masskg * gravity);
}

export async function main() {
    let settings = common.settingsStore.get();


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
        }

        if( watching.athlete ) {
            let eT = watching.stats.elapsedTime;
            let sessionkJ = watching.state.kj;
            let mass = watching.athlete.weight;

            let gravity = calculateGravity(lastHeight);

            let gainedHeight = calculateHeightGained(sessionkJ - lastkJ, mass, gravity );

            lastHeight += gainedHeight;
            lastkJ = sessionkJ;
            let speed = lastHeight / eT;

            let ttGSO = gso / speed; 
            body.innerHTML = `Eslapsed Time ${eT.toFixed(0)}<br /> 
                Gravity: ${gravity}<br />
                Power: ${lastkJ.toFixed(1)} kJ<br>
                Height: ${lastHeight.toFixed(0)} meters <br>
                Time to GSO: ${findTime(ttGSO)}`;
            console.log(watching);
        }

    });
}


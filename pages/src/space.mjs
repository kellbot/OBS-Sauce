import * as sauce from '/shared/sauce/index.mjs';
import * as common from '/pages/src/common.mjs';


let gameConnection;
const doc = document.documentElement;
const body = doc.querySelector('body');

const gso = 35786;


function toHoursAndMinutes(totalSeconds) {
    const absSeconds = Math.abs(totalSeconds);
    const totalMinutes = Math.floor(absSeconds / 60);

    const seconds = Math.floor(absSeconds % 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    const negative = (totalSeconds < 1) ? '-' : '';

    return { h: hours, m: minutes, s: seconds, n: negative, p: `${hours}:${minutes}:${seconds}`};
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
            let kJ = watching.state.kj;
            let h = (kJ * 1000) / (watching.athlete.weight * 9.81);
            let speed = h / eT;


            let ttGSO = gso / speed; 
            body.innerHTML = `Eslapsed Time ${eT.toFixed(0)}<br /> Power: ${kJ.toFixed(1)} kJ<br>
                Height: ${h.toFixed(0)} meters <br>
                Time to GSO: ${toHoursAndMinutes(ttGSO).p}`;
            console.log(watching);
        }

    });
}


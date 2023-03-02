import * as sauce from '/shared/sauce/index.mjs';
import * as common from '/pages/src/common.mjs';
import { dsNotes } from '../ds-notes.mjs';

const doc = document.documentElement;
let gameConnection;

const content = document.querySelector('#course-notes');
const progress = document.querySelector('#section-progress');
const meter = document.querySelector('#section-progress .meter');
let labelText;
if(document.querySelector('#section-progress') )  labelText = document.querySelector('#section-progress label').innerHTML;

const settings = common.settingsStore.get(null, {
    cleanup: 120,
    solidBackground: false,
    backgroundColor: '#00ff00',
    messageTransparency: 30,
});


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

function getNotes(route){

    let notes = dsNotes[route.id];

    return notes;
}

function setNotes(watching, notes){
    let distance = watching.state.eventDistance.toFixed(0);
    let current = watching.state.distance; //what's the difference between these two?
    if(notes) {
        //if (current > distance) return; //if we've finished the course do nothing
        notes.sort((a,b) => b.distance - a.distance); //reverse sort all notes
        notes.every((note, i) => {
            if(note.distance > current) {
                return true;
            } else {
                let next;
                if (i > 0) next = notes[i-1];
                let nextNoteDistance = next ? next.distance : current;
                console.log(`Rider distance: ${current} Event Distance: ${distance} Next note: ${next.distance}`);
                console.log(watching);
                let diff = nextNoteDistance - note.distance;
                let pos = current - note.distance;
                displayNote(note.text);
                if (meter) updateMeter(diff, pos);
                return false;
            }
        });
    }
}

function displayNote(text){
    content.innerHTML = text;
}

function updateMeter(total, current) {
    let pct = current / total * 100;
    meter.querySelector('.track').style.width = pct + "%";
    meter.querySelector('.trackLabel').innerHTML = (current) + " m";

    document.querySelector('#section-progress label').innerHTML = `${labelText} - ${total}m`;
}
function setBackground() {
    const {solidBackground, backgroundColor} = settings;
    doc.classList.toggle('solid-background', solidBackground);
    if (solidBackground) {
        doc.style.setProperty('--background-color', backgroundColor);
    } else {
        doc.style.removeProperty('--background-color');
    }
}
function setMsgOpacity() {
    const {messageTransparency} = settings;
    const opacity = messageTransparency == null ? 0.7 : 1 - (messageTransparency / 100);
    doc.style.setProperty('--message-background-opacity', opacity);
}
export async function renderNotes(watching){
    let event = getEvent(watching.state);
    let route = event.route;
    if(route) {

        let courseNotes = getNotes(route);
        if (courseNotes) setNotes(watching, courseNotes);
    } else {
        progress.style.display = 'none';
    }
   }


export async function main() {
    common.initInteractionListeners();
    setBackground();
    setMsgOpacity();
    common.settingsStore.addEventListener('changed', ev => {
        setBackground();
        setMsgOpacity();
    });

    const gcs = await common.rpc.getGameConnectionStatus();
    gameConnection = !!(gcs && gcs.connected);

    let athleteId;

    common.subscribe('athlete/watching', watching => {
        if (watching.athleteId !== athleteId) {
            athleteId = watching.athleteId;
        }
        if( watching.athlete ) {
            renderNotes(watching);
        }

    });

}
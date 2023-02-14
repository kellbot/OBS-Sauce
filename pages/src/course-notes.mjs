import * as sauce from '/shared/sauce/index.mjs';
import * as common from '/pages/src/common.mjs';


const doc = document.documentElement;
let lastNoteDistance;

const courseNotes = [
        {'distance': 0, 'text': "Lead in - 5.1 km mostly downhill / undulating ending with KOM"},
        {'distance': 2900, 'text': "100m @ 5%"},
        {'distance': 4500, 'text': "FAL 1 - Breakwaway KOM - 600m @ 2.4 avg / 7% max"},
        {'distance': 5800, 'text': "Flat / downhill 700m @ -2% max"},
        {'distance': 6000, 'text': "Bridge @ 4%"},
        {'distance': 6600, 'text': "200m @ 3%"},
        {'distance': 7500, 'text': "Kicker @ 3% going under viaduct"},
        {'distance': 8100, 'text': "200m @ 4%"},
        {'distance': 9100, 'text': "Kicker @ 3% approaching left-hand corner"},
        {'distance': 9700, 'text': "100m @ 3%"},
        {'distance': 10000, 'text': "200m @ 4%"},
        {'distance': 10600, 'text': "Sprint banner near pens, No FAL/FTS points on offer"},
        {'distance': 12100, 'text': "Castle corkscrew climb - 300m @ 9%"},
        {'distance': 13100, 'text': "Bridge % 4%"},
        {'distance': 13500, 'text': "Breakwaway KOM - 600m @ 2.4 avg / 7% max"},
        {'distance': 14100, 'text': "Flat / downhill 700m @ -2% max"},
        {'distance': 14800, 'text': "Flat / downhill 700m @ -2% max"},
        {'distance': 14900, 'text': "Bridge @ 4%"},
        {'distance': 15500, 'text': "200m @ 3%"},
        {'distance': 16400, 'text': "Kicker @ 3% going under viaduct"},
        {'distance': 17000, 'text': "200m @ 4%"},
        {'distance': 18000, 'text': "Kicker @ 3% approaching left-hand corner"},
        {'distance': 18600, 'text': "100m @ 3%"},
        {'distance': 18900, 'text': "200m @ 4%"},
        {'distance': 19500, 'text': "Sprint banner near pens, No FAL/FTS points on offer"},
        {'distance': 21000, 'text': "Castle corkscrew climb - 300m @ 9%"},
        {'distance': 22000, 'text': "Bridge % 4%"},
        {'distance': 22300, 'text': "Breakwaway KOM - 600m @ 2.4 avg / 7% max"},
        {'distance': 22900, 'text': "Flat / downhill 700m @ -2% max"},
];

function setNotes(watching, notes){
    let distance = watching.state.eventDistance;
    notes.sort((a,b) => b.distance - a.distance);
    for(let i in notes){
        if(notes[i].distance > distance) {
            continue;
        } else {
            displayNote(notes[i].text);
            return;
        }
    }
}

function displayNote(text){
    doc.querySelector("#notes").innerHTML = text;
}

export async function main() {
    common.initInteractionListeners();
    
    let athleteId;

    common.subscribe('athlete/watching', watching => {
        if (watching.athleteId !== athleteId) {
            athleteId = watching.athleteId;
        }
        if( watching.athlete ) {
            console.log(watching.state.eventDistance);
            setNotes(watching, courseNotes);
        }

    });

}
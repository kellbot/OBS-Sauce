let teamData = {
	"event" : "WTRL TTT",
	"course" : "Volcano Flats Reverse",
	"team": [
		{
			"name" : "Donna Hookway",
			"zid" : 3990168
		},
		{
			"name" : "Joanne Onions",
			"zid" : 5257178
		},
		{
			"name" : "Janice Rowan",
			"zid" : 5257178
		},
		{
			"name" : "Keen Fisk",
			"zid" : 5257178
		},
		{
			"name" : "Brian Mudge",
			"zid" : 5257178
		},
		{
			"name" : "Ingo Meyer",
			"zid" : 5257178
		}

	]
}

function toHoursAndMinutes(totalSeconds) {
  const totalMinutes = Math.floor(totalSeconds / 60);

  const seconds = Math.abs(Math.floor(totalSeconds % 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return { h: hours, m: minutes, s: seconds };
}

$(function() {


	$('#rider-template').hide();
$('#course-name .scrollbox').html(teamData.course);

async function setupDisplay(){
	const response = await fetch("../../../../api/athlete/stats/v1/self");
	let userData = response.json();   	
	

}

function updateDisplay(){

	//load in my data
	let mainRider;

	fetch('../../../../api/athlete/stats/v1/self')
		.then((response) => response.json())
	    .then((json) => { 
	    	mainRider = json;
	    	let riderTime = toHoursAndMinutes(mainRider.stats.elapsedTime);
	    	$('#timer .infolabel').html(
	    		riderTime.h + ":" + riderTime.m.toString().padStart(2,0) + ":" + riderTime.s.toString().padStart(2,0)
	    	);
	    	$('#current-power').html(mainRider.state.power.toString());
	    	//calculate zone from FTP
	    	//=(B12/A12 * 100 - 45) / 15 * 16.6
	    	let zonePCT = (mainRider.state.power / mainRider.athlete.ftp * 100-45) / 15 * 16.6;
	    	$('#powerzone .track')
	    	.animate('width: ' + zonePCT.toString() + '%', 700);
	    });



	fetch('../../../../api/nearby/v1')
			    .then((response) => response.json())
			    .then((json) => {
			    	teamData.team = json.slice(0,6);
					let riderLines = [];
					let riderList = $("<ul></ul>");

					for (i in teamData.team) {
							
							let riderLine = $("<li></li>");

							let riderTemplate = $.parseHTML('<span class="rider-name">Kelly Maguire</span> <span class="monotime">34:22</span>');
							riderLine.html(riderTemplate);
							let rider = teamData.team[i];
							fetch('../../../../api/athlete/stats/v1/' + rider.athleteId)
							    .then((response) => response.json())
							    .then((json) => {
							    	//console.log(json);
							    	let gap = toHoursAndMinutes(json.gap);
							    	riderLine.children('.monotime').html(gap.m + ":" + gap.s.toString().padStart(2,0));
							    	
									riderLine.children('.rider-name').html(json.athlete.fullname);
							    });
							

							riderLines[i] = riderLine;
							riderList.append(riderLine);
					}

					$('#roster ul').replaceWith(riderList);
					

			    });

}

setupDisplay();
//setInterval(updateDisplay, 1000);
//updateDisplay();	
});



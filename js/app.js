$(document).ready(function(){

	// TODO option if ECTS < or > required

	var config = {
		ti_ects : 4,
		to_ects : 4,
		li_ects : 2,
		lo_ects : 2,

		ti_min: 10,
		to_min: 4,
		li_min: 3,
		lo_min: 1,
	}
	var state = {
		// ects for each semester
		ects : {},
		// total teachings inside a sector etc
		ti : {},
		to : {},
		li : {},
		lo : {},
	}

	$('#t_ti_min').html(config.ti_min);
	$('#t_to_min').html(config.to_min);
	$('#t_li_min').html(config.li_min);
	$('#t_lo_min').html(config.lo_min);

	// which ects slot has a semester achieves. i.e. if semester 7 has 22 ects then 7:1
	var semester_success = {};

	$('.lessons_input').on('input', function(){

		// total ti etc
		var t_ti = 0;
		var t_to = 0;
		var t_li = 0;
		var t_lo = 0;

		for (var i=7; i<=10; i++){
			state.ti[i] = parseInt($('#ti_'+i).val());
			state.to[i] = parseInt($('#to_'+i).val());
			state.li[i] = parseInt($('#li_'+i).val());
			state.lo[i] = parseInt($('#lo_'+i).val());
			state.ects[i] = state.ti[i]*config.ti_ects + state.to[i]*config.to_ects + state.li[i]*config.li_ects + state.lo[i]*config.lo_ects;
			$('#ects_'+i).html(state.ects[i]);

			var semester_success_temp = false;
			for (var j = 1; j<=3; j++){
				var target = $('#target_ects_'+i+'_'+j);
				if (target.attr('data-ects') == state.ects[i]){
					target.removeClass('btn-secondary');
					target.addClass('btn-success');

					semester_success_temp = j;
				}
				else {
					target.addClass('btn-secondary');
					target.removeClass('btn-success');
				}
			}
			semester_success[i] = semester_success_temp;
			
			t_ti += state.ti[i];
			t_to += state.to[i];
			t_li += state.li[i];
			t_lo += state.lo[i];

		}

		changeProgressBars('#pb-ti', t_ti, config.ti_min);
		changeProgressBars('#pb-to', t_to, config.to_min);
		changeProgressBars('#pb-li', t_li, config.li_min);
		changeProgressBars('#pb-lo', t_lo, config.lo_min);

		var relationship_active = applySemesterEctsRelationships(7,8) || applySemesterEctsRelationships(8,7) || applySemesterEctsRelationships(9,10) || applySemesterEctsRelationships(10,9);

		applyEffectIfMin('#t_ti', t_ti, config.ti_min);
		applyEffectIfMin('#t_to', t_to, config.to_min);
		applyEffectIfMin('#t_li', t_li, config.li_min);
		applyEffectIfMin('#t_lo', t_lo, config.lo_min);

		// hide popovers because they're no longer accurate
		$('.popover').popover('hide');

		/* calculate if the form is valid */
		var completion = true;
		// calculate if all semesters are completed
		for (var i=7; i<=10; i++){
			if (!semester_success[i]){
				completion = false;
				break;
			}
		}
		// see if there's a related semester
		completion = completion && !relationship_active;
		completion = completion && t_ti >= config.ti_min && t_to >= config.to_min && t_li >= config.li_min && t_lo >= config.lo_min;

		if (completion){
			$('.valid_form').removeClass('hidden');
			$('.invalid_form').addClass('hidden');
		}
		else{
			$('.valid_form').addClass('hidden');
			$('.invalid_form').removeClass('hidden');
		}

	});

	function changeProgressBars(selector, value, min_value){
		var progress_value = (value/min_value <= 1 ? value/min_value : 1) * 25;
		if (value == 0)
			progress_value=1;
		$(selector).css('width', progress_value +'%');
		$(selector).attr('aria-valuenow', progress_value);
		if (progress_value == 25)
			$(selector).addClass('progress-bar-striped');
		else
			$(selector).removeClass('progress-bar-striped');
	}

	function applyEffectIfMin(selector, value, min_value){
		$(selector).html(value);
		if (value>=min_value)
			$(selector).addClass('bold');
		else
			$(selector).removeClass('bold');
	}

	// returns true if a relationship is active
	function applySemesterEctsRelationships(a, b){
		for (var i=1; i<=3; i++)
			$('#target_ects_'+b+'_'+ i).removeClass('btn-warning');
		if(semester_success[a]){
			var target_index = (4-semester_success[a]);
			var target = $('#target_ects_'+b+'_'+ target_index);
			if (semester_success[b] != target_index){
				target.addClass('btn-warning');		
				return true;	
			}
		}
		return false;
	}

	$('.target_ects').click(function() {

		var current_ects = parseInt($('#ects_'+$(this).attr('data-semester')).html());
		var target_ects = $(this).attr('data-ects');

		var difference = target_ects - current_ects;
		var html;
		if (difference == 0){
			html = 'Έχετε ακριβώς τα ζητούμενα ECTS';
		}
		else {

			if (difference <0) {
				html = 'Αρνητικό. Πρέπει να αφαιρέσετε κάποιον απο τους παρακάω συνδυασμούς μαθημάτων:';
				difference = -difference;
			}
			else
				html = 'Απομένουν ' + difference + ' ects<br>Πιθανοί συνδυασμοί μαθημάτων:';

			// the following only works if ti=to and li=lo
			var teaching_count = 0;
			var labs_count = 0;
			/* I haven't done much testing, but they following code might work correctly only if:
			 ti_ects/li_ects = integer
			 there should be a more efficient way to calculate
			 */
			// find the first combination
			while (difference > 0){
				if (difference >= config.ti_ects){
					teaching_count += 1;
					difference -= config.ti_ects;
				}
				else if (difference >= config.li_ects){
					labs_count += 1;
					difference -= config.li_ects;
				}
				if (difference == 0) {
					html += "<br>Διδασκαλίες: " + teaching_count + ", Εργαστήρια: " + labs_count;
				}
			}
			while (teaching_count !=0 ){
				var labs_ects = 0;
				while (labs_ects < config.ti_ects){
					labs_ects += config.li_ects;
					labs_count++;
				}
				teaching_count--;
				html += "<br>Διδασκαλίες: " + teaching_count + ", Εργαστήρια: " + labs_count;

			}
		}

		$(this).attr('data-content', html);
		$(this).popover('toggle');


	});

	// manual popovers, we will trigger them on our custom click function
	$(function () {
		$('[data-toggle="popover"]').popover({
			trigger : 'manual',
			html : true,
			placement: function (tip, element) {
				var offset = $(element).offset();
				height = $(document).outerHeight();
				width = $(document).outerWidth();
				vert = 0.5 * height - offset.top;
				vertPlacement = vert > 0 ? 'bottom' : 'top';
				horiz = 0.5 * width - offset.left;
				horizPlacement = horiz > 0 ? 'right' : 'left';
				placement = Math.abs(horiz) > Math.abs(vert) ?  horizPlacement : vertPlacement;
				return placement;
			}
		});
		// $('[data-toggle="popover"]').popover();
	});

	$('#moreInstructionsIconDiv').click(function(){
		$("#moreInstructionsDiv").slideDown("slow", function(){
			$('#moreInstructionsIconDiv').addClass('hidden');
			$('#lessInstructionsIconDiv').removeClass('hidden');	
		});
	});

	$('#lessInstructionsIconDiv').click(function(){
		$("#moreInstructionsDiv").slideUp("slow", function(){
			$('#lessInstructionsIconDiv').addClass('hidden');	
			$('#moreInstructionsIconDiv').removeClass('hidden');
			// document.getElementById("lessons").scrollIntoView({behavior: "smooth"});
		});
	});

});
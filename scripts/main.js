(function($) {

$("li").live("click", function(ev) {
	$(this).not(".disabled").
		siblings().removeClass("selected").end().
		toggleClass("selected");
});

$("#btnFullscreen").click(function(ev) {
	toggleFullscreen();
});

var toggleFullscreen = function() { // TODO: argument to avoid hard-coding the last pane
	var els = $(".pane:visible");
	if(els.length > 1) {
		els.slice(0, -1).slideUp(function() {
			els.eq(-1).css("height", "100%"); // XXX: executed multiple times
		});
	} else {
		$(".pane").slideDown(function() { // XXX: fullscreen pane needs special handling to ensure smooth animation
			$(this).removeAttr("style");
		});
	}
};

})(jQuery);

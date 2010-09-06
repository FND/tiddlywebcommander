(function($) {

$("li").live("click", function(ev) {
	$(this).
		siblings().removeClass("selected").end().
		toggleClass("selected");
});

})(jQuery);

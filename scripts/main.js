(function($) {

$("li").live("click", function(ev) {
	$(this).not(".disabled").
		siblings().removeClass("selected").end().
		toggleClass("selected");
});

})(jQuery);

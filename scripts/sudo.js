var sudo = function(fn) {
	if(document.location.protocol.indexOf("file") == 0 && window.Components &&
			window.netscape && window.netscape.security) {
		window.netscape.security.PrivilegeManager.
			enablePrivilege("UniversalBrowserRead");
	}
	return fn();
};

// hijack ajax function to provide enhanced privileges
var ajax = $.ajax;
$.ajax = function() {
	var self = this;
	var args = arguments;
	return sudo(function() {
		return ajax.apply(self, args);
	});
};

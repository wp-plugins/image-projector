/**
 * Plugin Name: Image Projector
 * Plugin URI: http://www.lystfotograf.net/imageprojector
 * Description: A swift viewer and slideshow for the first image in published posts. Good for photographers. No gallery required. 
 * Version: 1.4
 * Author: Christian G
 * Author URI: http://www.lystfotograf.net
 * License: GPL2
*/


jQuery(document).ready(function( $ ) {

	if ( ! ( 'undefined' === typeof WPIVConfig ) )
	{
		WPIV.settings(WPIVConfig);	

		jQuery(WPIVConfig.bindto).bind('click', function( event ){
		
			jQuery(event.target).parent().blur();
			
			//continue with default action if no connection image-post is found
			return(! WPIV.start(jQuery(this)));
			
		});
	}

});	
"use strict";
var WPIV = WPIV || {} 
WPIV = {

	_doNotDisturb	: 0,

	_captionON		: false,
	_showMenu		: 0,

	_numberOfSlides	: 0,
	_initialSlide	: 0,	
	_slideNumber	: 0,
	
	_lastScrollPos	: 0,
	_lastNavigation : 0,
	_viewStyle		: 1,
	_autoTimer		: null,
	_autoDo			: false,
	_pageType		: '',

	_initialBodyH	: '',
	_initialHtmlH	: '',
	_siteUrl		: '',
	_captions		: Array(),
	_allPosts		: false,
	_fadeDurationMS	: 0, // in milliseconds
	//DOM element cache
	_el				: Array(),

    'cfg' : {

		'menuOverlay'		: true,
		'menuHeight'		: 50,
		'autoDuration'		: 3,  //secs	
		'parr'				: Array(),
		'postString'		: '',
		'wpUploadUrl'		: '',
		'wpPluginUrl'		: '',
		'expectedLoadtime'	: 6,  //secs	
		'slowMessage'		: 'Slow network or large image file? You may wait to see if the image appears or refresh page...',
		'fadeDuration'		: 500, //milliseconds
		'doNotScaleUp'		: false,
		'supportCaptions'	: false,
		'version'			: ''
	},
	'settings' : function(cfg){
	
			if (cfg && typeof(cfg) === 'object') {
				jQuery.extend(WPIV.cfg, cfg);
			}
			if(WPIV.cfg.postString)	{
				var arr=[];
				arr.push.apply(arr, WPIV.cfg.postString.split(",").map(Number));
				WPIV.cfg.parr = arr;
			}else {

				WPIV._allPosts 	= true;
			}
	},	
	'start' :function($initimage){

		if (typeof wpiv_postarray === 'undefined') {
			return (false);
		}
	
		
		//count the number of posts, disregarding array position [0]
		var totalPosts 			= wpiv_postarray.length;
		var clickedImage 		= $initimage.attr("src");		
		var clickedGlobalSeqno	= null;

		if( ! WPIV._allPosts) {
				WPIV._numberOfSlides = WPIV.cfg.parr.length-1;	
			}else {
				WPIV._numberOfSlides = totalPosts-1;
		}
		WPIV._siteUrl = window.location.protocol + "//" + window.location.host;
		clickedGlobalSeqno = $initimage.data("seqno");
		if( ! clickedGlobalSeqno){

			var clickedPostID = null;
			clickedPostID = $initimage.data("postid");
			
			if(clickedPostID > 0 ) {
				for (var i = 1; i < totalPosts; i++) {
				if (clickedPostID === wpiv_postarray[i][0]) { //[0] is post id
						clickedGlobalSeqno = i;
						break;
					}				
				}
			}else if (clickedImage.length > 0) {
				for (var i = 1; i < totalPosts; i++) {
				if (clickedImage.lastIndexOf(wpiv_postarray[i][3]) !== -1) {//[3] is image filename
						clickedGlobalSeqno = i;
						break;
					}				
				}	
			}else {
				clickedGlobalSeqno = null; // no connection post-image
			}
		}

		if(clickedGlobalSeqno) 
		{
			if(WPIV._numberOfSlides === 1) {
				WPIV.cfg.parr[1] 	= clickedGlobalSeqno;
				WPIV._slideNumber 	= 1;
			} else if( ! WPIV._allPosts ) {
				for (var i = 1; i < WPIV.cfg.parr.length; i++) {
					for (var j = 1; j < totalPosts; j++) {
						if (WPIV.cfg.parr[i] === wpiv_postarray[j][0])
						{
							WPIV.cfg.parr[i] = j; //replace postid with global sequence no
							break;
						}
					}
					if (WPIV.cfg.parr[i] === clickedGlobalSeqno)
					{
						WPIV._slideNumber = i;
					}	
				}

			}else {
				WPIV._slideNumber = clickedGlobalSeqno;
			}
					

		var trans = 
			WPIV._initialSlide 		= WPIV._slideNumber;
			WPIV._lastNavigation	= 1; // this will preload next post
			
			//transition time on fraction-of-second format
			WPIV._transDuration		= Math.round(10*WPIV.cfg.fadeDuration/1000)/10;
			WPIV.setup();
			
			WPIV.setupEventHandlers();
			WPIV.show(true);
			
			if(WPIV.cfg.supportCaptions) {
				WPIV.getcaptions();
			}

			return (true);
		} else { //no connection image-post found returning false will continue with default action

			return (false); 
		}
	 
	},
	'getcaptions' : function() {

		var jfile = WPIV.cfg.wpPluginUrl+'/ref/wpiv_ref_c_'+WPIV.cfg.version+'.json';
		var sno, caption, href, postid;
		jQuery.getJSON( jfile, function( data ) {
			jQuery.each( data, function( key, val ) { 
				WPIV._captions[key]=val;
			});
			
			if( ! WPIV._allPosts) {
				sno 	= WPIV.cfg.parr[WPIV._slideNumber];
			}else {
				sno 	= WPIV._slideNumber;
			}	
			postid	= wpiv_postarray[sno][0];
			caption = WPIV._captions[postid]+'  ('+WPIV._slideNumber+"/"+WPIV._numberOfSlides+')';

			WPIV._el.caption.html(caption);	
		
		});
		
	},
	'setup': function(){

		WPIV._showMenu 		= false;
		WPIV._captionON 	= false;
		WPIV._doNotDisturb	= 0;
		
		if(WPIV.cfg.menuOverlay 	!= 1 ) WPIV.cfg.menuOverlay 	= false;
		if(WPIV.cfg.supportCaptions != 1 ) WPIV.cfg.supportCaptions = false;
		
		// cache initial settings for later restore
		WPIV._initialHtmlH 		= jQuery('html').css("height");			
		WPIV._initialBodyH 		= jQuery('body').css("height");


		//make body fit browser window with no scrollbars
		var offs = window.pageYOffset;
		if(offs === 0) offs = jQuery('body').scrollTop();
		WPIV._lastScrollPos = offs;



		if(jQuery('body').hasClass("single")) {WPIV._pageType="single";}	
		jQuery('html').css({"height":"100%","width":"100%"});
		jQuery('html, body').scrollTop(0);
		jQuery('html, body').css({"overflow":"hidden"});
		jQuery('body').css({"height":"100%","width":"100%"});
	
		ipPrependTo = 'body';
		ipClass = 'wpiv_underlay_full';	
		

		//underlay, the container for all elements
		WPIV._el.underlay = jQuery('<div></div>')
			.attr({'id':'wpiv_underlay'})
			.prependTo(ipPrependTo)
			.addClass(ipClass);
	
		WPIV._el.underlay.addClass('wpiv_underlay_one');

		
		
		//image wrapper 
		WPIV._el.wrapper = jQuery('<div></div>')
			.attr('id','zoomcontainer')
			.css({"position":"relative",'overflow':'hidden'})
			.appendTo(WPIV._el.underlay);

		
		
		//add two img elements to switch between, inside the image wrapper
		for (var i = 0; i < 2; i++) {
			jQuery('<img/>')
			.attr({id:'wpiv_img_'+i,alt:'Slide','src':WPIV.cfg.wpPluginUrl+'/img/wpiv-theimage.gif',
			"width":1,"height":1})
			.css({'position':'absolute','opacity':'0'})
			.addClass('forceGPU')
			.appendTo(WPIV._el.wrapper);
			
						
		}

		WPIV._el.imgA = jQuery("#wpiv_img_0");
		WPIV._el.imgB = jQuery("#wpiv_img_1");
	
		//an overlay to hold a busy-loading indicator if necessary
		WPIV._el.overlay = jQuery('<div></div>').attr('id','wpiv_ovl')
		.css({'width':'100%','height':'100%','text-align':'center'}) //initial size and position
		.appendTo(WPIV._el.underlay);
		
		//long loading time message
		WPIV._elZoomOvlText = jQuery('<div>'+WPIV.cfg.slowMessage+'</div>').attr('id','wpiv_ovl_text')
		.appendTo(WPIV._el.overlay);	
		
		//a hidden image element to store preloaded image
		WPIV._el.preloadNext = jQuery('<img/>')
			.attr({alt:'Preload next',	src:'',id:'wpiv_preload_next'})
			.css({"display":"none" })
			.appendTo(WPIV._el.underlay);
		WPIV._el.preloadPrev = jQuery('<img/>')
			.attr({alt:'Preload previous',	src:'',id:'wpiv_preload_prev'})
			.css({"display":"none" })
			.appendTo(WPIV._el.underlay);

		//menu and other items		
		jQuery('<div id="wpiv_menu"><ul><li id="wpiv_view" class="wpiv_cmd"  unselectable="on" >style</li><li id="wpiv_bck" class="wpiv_cmd"  unselectable="on" >background</li><li id="wpiv_play" class="wpiv_cmd" unselectable="on" >auto</li><li id="wpiv_exit" class="wpiv_cmd"  unselectable="on" >exit</li></ul></div>')
			.css({"width":"100%","min-width":"300px","overflow":"hidden",
			"height":WPIV.cfg.menuHeight,
			"position":"absolute","bottom":WPIV.cfg.menuHeight*-1,"left":"0px","cursor":"pointer","z-index":"1050"})
			.appendTo(WPIV._el.underlay);
			
		if(WPIV.cfg.supportCaptions) {
			jQuery('<li id="wpiv_caption_switch" class="wpiv_cmd"  unselectable="on" >captions</li>')
				.prependTo('#wpiv_menu>ul');
		} else{
			jQuery('<li id="wpiv_imginfo"  unselectable="on" ></li>')
				.prependTo('#wpiv_menu>ul');
		}
		WPIV._el.bckswitch   	= jQuery("#wpiv_bck");
		WPIV._el.captionswitch 	= jQuery("#wpiv_caption_switch");
		WPIV._el.menu			= jQuery("#wpiv_menu");
		WPIV._el.counter		= jQuery("#wpiv_imginfo");
		WPIV._el.style			= jQuery("#wpiv_view");
		WPIV._el.auto			= jQuery("#wpiv_play");
		WPIV._el.exit			= jQuery("#wpiv_exit");
	
		jQuery("div#wpiv_menu ul li").css({"width":"20%","line-height":WPIV.cfg.menuHeight+"px"});

		//caption support, if set in plugins admin menu
		if(WPIV.cfg.supportCaptions) {	
			jQuery('<div id="wpiv_caption" unselectable="on"></div>')
				.css({"width":"100%","overflow":"hidden","text-overflow":"ellipsis","white-space":"nowrap","height":WPIV.cfg.menuHeight,"z-index":"1040",
				"position":"absolute","bottom":WPIV.cfg.menuHeight*-1,"line-height":WPIV.cfg.menuHeight+"px"})
				.appendTo(WPIV._el.underlay);
				
			WPIV._el.caption = jQuery("#wpiv_caption");
			if(WPIV._captionON) {WPIV._el.caption.show();}else {WPIV._el.caption.hide();}
		}
		 
		//do not allow auto-advance when one post, neutralize the button
		if(WPIV._numberOfSlides < 2) { 
			WPIV._el.auto.removeClass("wpiv_cmd");
			WPIV._el.auto.addClass("wpiv_cmd_inactive");		
		}		
		//next and prev button as defined in stylesheet	
		WPIV._el.next= jQuery('<div id="wpiv_next"></div>').hide().appendTo(WPIV._el.underlay);
		WPIV._el.prev= jQuery('<div id="wpiv_prev"></div>').hide().appendTo(WPIV._el.underlay);
		
		//auto-advance indicator as defined in stylesheet
		WPIV._el.running=jQuery('<div title="Running slides"></div>')
			.attr({id:'wpiv_running'})
			.appendTo(WPIV._el.underlay);
	
		//set up default view style
		WPIV.switchview(WPIV._viewStyle);
		
		//position the next/rev arrows
		WPIV.positionarrows();

		return;
	},
	'show'	: function(isinit) {
		if(WPIV._doNotDisturb) return;
		
		WPIV._doNotDisturb = 1;
		var useCrossFade = true;
		var $imgElNext, $imgElCurr, imgURL, longerThanExpectedTimer, sno;

		if( ! WPIV._allPosts) {
			sno 	= WPIV.cfg.parr[WPIV._slideNumber];
		}else {
			sno 	= WPIV._slideNumber;
		}
		var postID	= wpiv_postarray[sno][0];
		var wn 		= wpiv_postarray[sno][1];
		var hn 		= wpiv_postarray[sno][2];
		var src 	= wpiv_postarray[sno][3];

		
		//build src attribute for image
		if(src.indexOf("http") < 0)
		{	//file on your domain, path relative to wp upload dir
			imgURL 	= WPIV.cfg.wpUploadUrl + src;
		}else {
			imgURL 	= src;
		}
		//image element for current image is on top of stack, this shall be hidden
		$imgElCurr = WPIV._el.wrapper.find('img:first');
		
		//rotate the stack
		WPIV._el.wrapper.find('img:last').prependTo(WPIV._el.wrapper);
		
		//image element for next image is now on top of stack, this shall be shown	
		$imgElNext = WPIV._el.wrapper.find('img:first');

		//start timer to show loading in progress if image not loaded after 300 ms
		var progTimer = setTimeout(function () {showLoader()}, 300);
		
		//for Firefox, to trigger imagesloaded
		$imgElNext.attr({src:''});
		
		$imgElNext.attr({'src':imgURL,'width':wn,'height':hn})
			.data({"naturalwidth":wn,"naturalheight":hn,"seqno":WPIV._slideNumber});
		//the top img element in wrapper now waiting to be displayed
		

		//fit divs if w and h set, otherwise wait until img loaded
		if(wn && hn ) {
			WPIV.fitimage();
		}

		var imgLoad = imagesLoaded( $imgElNext); //desandro's imagesloaded kicks in

		imgLoad.on( 'done', function( instance ) {
			//hide any progress messages and stop progress timers
			
			if((!wn || !hn ) || (wn < 2 || hn < 2)) {
				
				wn = imgLoad.images[0].img.naturalWidth;
				hn = imgLoad.images[0].img.naturalHeight;
				$imgElNext.attr({'width':wn,'height':hn}).data({"naturalwidth":wn,"naturalheight":hn});				
				WPIV.fitimage();
			}
			clearTimeout(longerThanExpectedTimer);
			clearTimeout(progTimer);

			WPIV._el.overlay.css("background-image","none");
			WPIV._elZoomOvlText.hide();
			
			//fade in new image by css, fade out old image
			$imgElNext.css({'opacity':'1','display':'block','transition': 'opacity '+WPIV._transDuration+'s linear'});
			$imgElCurr.css({'opacity':'0','display':'block','transition': 'opacity '+WPIV._transDuration+'s linear'});
			WPIV._doNotDisturb = 0;

			if(WPIV.cfg.supportCaptions) {
				WPIV._el.caption.html(WPIV._captions[postID]+'  ('+WPIV._slideNumber+"/"+WPIV._numberOfSlides+')');			
			}
				
			//preload next or previous depending on last direction
			if(WPIV._numberOfSlides > 1) {
				
				var preloadSlide = (WPIV._lastNavigation > -1 ? WPIV.next() : WPIV.previous());
				
				//build src attribute for preload image
				var preloadSno;
				if( ! WPIV._allPosts) {
					preloadSno 	= WPIV.cfg.parr[preloadSlide];
				}else {
					preloadSno 	= preloadSlide;
				}				
				var preloadUrl = WPIV.cfg.wpUploadUrl+wpiv_postarray[preloadSno][3];
				
				//and start the preload
				WPIV._el.preloadNext.attr({src: preloadUrl});
			}

		});

		//update counter in menu bar if caption not supported
		if(!WPIV.cfg.supportCaptions) {
			WPIV._el.counter.html(WPIV._slideNumber+" / "+WPIV._numberOfSlides);
		}
		
		//progress indication functions
		function showLoader() {
			WPIV._el.overlay.css("background-image","url('"+WPIV.cfg.wpPluginUrl+"/img/wpiv-loader.gif')");
			longerThanExpectedTimer = setTimeout(function () {showLongerThanExpected()}, WPIV.cfg.expectedLoadtime*1000);
		} 
		function showLongerThanExpected() {
			WPIV._elZoomOvlText.show();

		} 
		
	},
	'positionarrows'		: function(){
		
		var availH 		= WPIV._el.underlay.height();
		var arrowSize	= WPIV._el.next.outerHeight();
		
		if(WPIV._showMenu || WPIV._captionON) {
			availH = availH - WPIV.cfg.menuHeight;
		}
		
		var top 		= Math.round((availH - arrowSize) / 2);
		
		//assuming height of prev and next arrow is same-same
		WPIV._el.prev.css({"top": top});
		WPIV._el.next.css({"top": top});
	},

	'setupEventHandlers'	: function(){

		//swipe
		 
		var swipel = document.getElementById('wpiv_ovl');
		
		var hammertime = new Hammer(swipel);
		hammertime.get('swipe').set({velocity:0.001});
		hammertime.on("swipeleft", function(ev) {
				if(WPIV._doNotDisturb) return;
			 	WPIV._slideNumber = WPIV.next();
				WPIV.show();

		});
		hammertime.on("swiperight", function(ev) {
				if(WPIV._doNotDisturb) return;
			 	WPIV._slideNumber = WPIV.previous();
				WPIV.show();
		
		});
	 		
		//trace click in window, depending on location - navigate or toggle menu
		WPIV._el.underlay.on('click', function(event) {

			if(WPIV._doNotDisturb) return;
			
			event.preventDefault();
			var scrollLeft	= jQuery(window).scrollLeft();
			var scrollTop	= jQuery(window).scrollTop();	

	
			var winW 		= WPIV._el.underlay.width();
			var winH 		= WPIV._el.underlay.height();
			
			var clickX, clickY, clickWidth;
			
			clickX = event.pageX;
			clickY = event.pageY;
 
			var underlayOffset = WPIV._el.underlay.offset();
			
			
			var clickX = clickX - underlayOffset.left;
			var clickY = clickY - underlayOffset.top;


			//if only one slide, only possible action is toggling menu - no next/prev 
			if(WPIV._numberOfSlides === 1) {
				WPIV.showmenu( ! WPIV._showMenu)
				return;
			}	

			//bottom of screen
			var clickHeightMax = winH + scrollTop;
			
			//bottom of next/previous click area
			var clickHeightMin = winH + scrollTop - WPIV.cfg.menuHeight;

			//width of next/previous click area, a bit larger when width of window is small	
			if((winW-scrollLeft) < 320) {clickWidth = 0.3*winW;} else {clickWidth = 0.2*winW;}


			//previous
			if( clickX - scrollLeft < clickWidth && clickY < clickHeightMin) {
				WPIV._slideNumber = WPIV.previous();
				WPIV.show();
			}
			//next
			else if (clickX + scrollLeft > winW - clickWidth && clickY < clickHeightMin) {
				WPIV._slideNumber = WPIV.next();
				WPIV.show();
			}else {
				//toggle menu
				WPIV.showmenu( ! WPIV._showMenu)
			}
			return;
		});
		//switch style button (view)
		 WPIV._el.style.on('click', function(event) {
			event.stopPropagation();		 
			WPIV.switchview();
			WPIV.fitimage();
		});
		//exit button
		 WPIV._el.exit.on('click', function(event) {
			event.stopPropagation();
			WPIV.reset();
		
		});
		//caption button
		 WPIV._el.captionswitch.on('click', function(event) {
			event.stopPropagation();
			WPIV.showcaptions( ! WPIV._captionON);
			WPIV.showmenu( ! WPIV._showMenu);
		
		});
		//background button
		 WPIV._el.bckswitch.on('click', function(event) {
			event.stopPropagation();
			WPIV.switchbackground();
		});		
		//auto-advance button
		 WPIV._el.auto.on('click', function(event) {
			event.stopPropagation();
			WPIV.startstop();
		}); 	
		//keys, disable down/up arrow keydown to avoid scrolling
		jQuery(document).on('keydown', (function(e) {

			if (e.keyCode === 40 || e.keyCode === 38) {
				return false;
			}
		}));
		//keys, shortcut keys
		jQuery(document).on('keyup', (function(e) {
			e.stopPropagation();

			switch (e.keyCode) {
				case 27: //Esc
				case 88: //X - eXit
					WPIV.reset();
					break;
				case 65: //A - Auto
					WPIV.startstop();
					break;
				case 37: //Left arrow
				case 80: //P - Previous
					if(!WPIV._doNotDisturb && WPIV._numberOfSlides > 1)
					{
						WPIV._slideNumber = WPIV.previous();
						WPIV.show();
					}
					break;
				case 39: //Right arrow
				case 78: //N - Next
					if(!WPIV._doNotDisturb && WPIV._numberOfSlides > 1)
					{
						WPIV._slideNumber = WPIV.next();
						WPIV.show();
					}
					break;
				case 76: //L - Last
					if(!WPIV._doNotDisturb) {
						WPIV._slideNumber = WPIV._numberOfSlides;
						WPIV.show();
					}								
					break;
				case 40: //Down arrow
					if (WPIV._showMenu) WPIV.showmenu(false);
					break;
				case 38: //Up arrow
					if ( ! WPIV._showMenu) WPIV.showmenu(true);				
					break;
				case 83: //S - Style
				case 86: //V - View
				case 89: //Y - stYle
					WPIV.switchview();
					WPIV.fitimage();				
					break;
				case 66: //B - Background
					WPIV.switchbackground();
					break;
				case 67: //C - Captions
					if (WPIV.cfg.supportCaptions) {
						WPIV.showcaptions( ! WPIV._captionON);
					}		
					break;
			}
		})); 

		//handle resize window event
		jQuery( window ).on('resize', (function(e) {
			WPIV.windowresize()
		})); 
	
	},

	'showmenu'	: function(showit) {

		if(showit) {

			WPIV._showMenu = true;

			//fit image if menu not set to overlay
			if( ! WPIV.cfg.menuOverlay && !WPIV._captionON ) {
				WPIV.fitimage(1); //1 = smooth
			}
			WPIV._doNotDisturb = 1;
			WPIV._el.menu.show();
			WPIV._el.menu.animate({
					bottom: "+="+WPIV.cfg.menuHeight,
				}, 300, function() {
					WPIV._doNotDisturb=0;
					WPIV.showarrows(true);
					WPIV.positionarrows();
				}
			);
			
		
		}
		else {
			WPIV._showMenu = false;

			//fit image if menu not set to overlay
			if( ! WPIV.cfg.menuOverlay && !WPIV._captionON ) {
				WPIV.fitimage(1); //1 = smooth
			}
			WPIV._doNotDisturb = 1;
			WPIV.showarrows(false)
			WPIV._el.menu.animate({
					bottom: "-="+WPIV.cfg.menuHeight,
				}, 300, function() {
					WPIV._doNotDisturb=0;
					WPIV._el.menu.hide();
					WPIV.positionarrows();
				}
			);
			
			
		}
		return;
	},
	'showcaptions'	: function(showit){
		if(WPIV._doNotDisturb === 1) return;
		if(showit) {
			WPIV._captionON 	= true;
			WPIV._doNotDisturb	= 1;	
			
			if((!WPIV._showMenu && ! WPIV.cfg.menuOverlay) || WPIV.cfg.menuOverlay) {
				WPIV.fitimage(1);
			}
			WPIV._el.caption.show();

			WPIV._el.caption.animate(
				{bottom: "+="+WPIV.cfg.menuHeight
				},
				300, function() {WPIV._doNotDisturb=0;}
			);

		}else{
			WPIV._doNotDisturb=1;
			WPIV._captionON = false;
			
			if((!WPIV._showMenu && ! WPIV.cfg.menuOverlay) || WPIV.cfg.menuOverlay){
				WPIV.fitimage(1);				
			}	

			WPIV._el.caption.animate(
				{bottom: "-="+WPIV.cfg.menuHeight},
				300, function() {WPIV._doNotDisturb=0;WPIV._el.caption.hide();}
			);
		}
	
	},
	'showarrows' : function (showit) {

		if(WPIV._numberOfSlides < 2) return;
		
		if(showit) {
				WPIV._el.next.show();
				WPIV._el.prev.show();				
			}else {
				WPIV._el.next.hide();
				WPIV._el.prev.hide();					
		}
	
	},
 	'startstop'	: function() {
		if(WPIV._numberOfSlides < 2) return;
		
		if( ! WPIV._doNotDisturb || WPIV._autoDo) { //if busy, it can only be stopped
			if( ! WPIV._autoDo) {
					WPIV._autoDo = true;
					WPIV._el.auto.text("stop").addClass("wpiv_auto_running");
					WPIV._el.running.show();

				
					if (WPIV._showMenu) WPIV.showmenu(false);
					autoNext();
				} else {
					WPIV._el.running.hide();			
					WPIV._el.auto.text("auto").removeClass("wpiv_auto_running");

					WPIV._autoDo = false;
					clearTimeout(WPIV._autoTimer);
					WPIV._autoTimer = null;
				}
				

		}
		function autoNext() {
			if(WPIV._autoDo) {
			
				WPIV._autoTimer = setTimeout(function(){
						if( ! WPIV._autoDo) { 
							clearTimeout(WPIV._autoTimer);
							WPIV._autoTimer = null;
						}else
						{
						 if( ! WPIV._doNotDisturb) {
								WPIV._slideNumber = WPIV.next();
								WPIV.show();
											
							}
						}
				autoNext();

				},parseInt(WPIV.cfg.autoDuration)*1000);
			}
		
		}		
		return;
	},
	'switchbackground'	: function() {
		if(WPIV._el.underlay.hasClass("wpiv_underlay_one")) {
			WPIV._el.underlay.removeClass('wpiv_underlay_one');
			WPIV._el.underlay.addClass('wpiv_underlay_two');
		}else
		{
			WPIV._el.underlay.removeClass('wpiv_underlay_two');
			WPIV._el.underlay.addClass('wpiv_underlay_one');	
		}
	},	
	'next'	: function() {
		
		WPIV._lastNavigation = 1;
		var seqno = WPIV._slideNumber + 1;
		if (seqno > WPIV._numberOfSlides) seqno=1;
		return(seqno);

	},
	'previous'	: function() {
	
		WPIV._lastNavigation = -1;
		seqno = WPIV._slideNumber - 1;
		if (seqno < 1) seqno = WPIV._numberOfSlides;
		return(seqno);		
		
	},

	'windowresize' : function() {
		WPIV.fitimage();
		WPIV.positionarrows();

	},
	
	'switchview': function(viewno) {
		if( ! WPIV._doNotDisturb) {
			if(typeof viewno === 'undefined') {
				if(WPIV._viewStyle === 3) { //remove old img classes
					WPIV._el.imgA.removeClass('wpiv_view_border');
					WPIV._el.imgB.removeClass('wpiv_view_border');		
				}
				if(WPIV._viewStyle < 4) WPIV._viewStyle++; else WPIV._viewStyle = 1;

			} else WPIV._viewStyle = viewno;
			
			WPIV._el.wrapper.removeClass();
		
			switch(WPIV._viewStyle) {
				case 1: WPIV._el.wrapper.addClass('wpiv_view_square_one');break;
				case 2: WPIV._el.wrapper.addClass('wpiv_view_square_two');break;
				case 3: WPIV._el.imgB.addClass('wpiv_view_border');
						WPIV._el.imgA.addClass('wpiv_view_border');
						break;
				case 4: //no partucluar setting at the moment
						break;			
			}

		}			
	},	
	'fitimage' : function(animateResize) {

		var scrollTop 	= 0;//jQuery(window).scrollTop();
		var winMarginH	= 40;
		var winMarginW	= 60;
		

		var winW 		= jQuery(window).width();
		var winH 		= jQuery(window).height();

		if( (! WPIV.cfg.menuOverlay && WPIV._showMenu) || WPIV._captionON) {
			winH = winH - WPIV.cfg.menuHeight;
			winMarginW	= 100;
		}	

		var w, h, border, hScale, wScale, pScale, fitH, fitW, marginL, marginT, wrpH, wrpW, wrapMarginL, wrapMarginT, ovlT, ovlL, ovlW, ovlH, animateWrapper;
		
		if(typeof animateResize === 'undefined') animateResize = 0;

		wrapMarginL = 0;
		wrapMarginT = 0 + scrollTop;
			
		wrpH = wrpW = '100%';
		
		$ovl = WPIV._el.overlay;
		$wrp = WPIV._el.wrapper;
		$img = WPIV._el.wrapper.find('img:first');

		w = $img.data("naturalwidth");
		h = $img.data("naturalheight");
		
		if(WPIV._viewStyle === 1 || WPIV._viewStyle === 2)
		{
			//view type 1 and 2, square
			var winSquare=Math.min(winW-winMarginW, winH-winMarginH);
			hScale = (winSquare)/h;
			wScale = (winSquare)/w;
			pScale = Math.min(hScale, wScale);

			fitW = Math.round(w*pScale);
			fitH = Math.round(h*pScale);
			
			marginL = Math.round((winSquare-fitW)/2);
			marginT = Math.round((winSquare-fitH)/2);
			
			wrapMarginL = Math.round((winW-winSquare)/2);
			wrapMarginT = Math.round((winH-winSquare)/2) + scrollTop;
			
			wrpH = wrpW = winSquare;
			
			ovlH = ovlW = winSquare;
			ovlT  = wrapMarginT;
			ovlL  = wrapMarginL;

			if(animateResize) animateWrapper = true;
		}
		
		else if (WPIV._viewStyle === 3)
		{
			// view type 3, image with border
	
			border = Math.round(($img.outerWidth()-$img.innerWidth())/2);
	
			hScale = (winH-winMarginH-(2*border))/(h+2*border);
			wScale = (winW-winMarginW-(2*border))/(w+2*border);
				
			pScale = Math.min(hScale, wScale);

			fitW = Math.round((w+2*border)*pScale);
			fitH = Math.round((h+2*border)*pScale);
			
			marginL = Math.round((winW-fitW)/2)-border;
			marginT = Math.round((winH-fitH)/2)-border;
			
			ovlH  = fitH+2*border;
			ovlW  = fitW+2*border;
			
			ovlT  = marginT;
			ovlL  = marginL;			
		}		
		else {
			// view type 4, full throttle!
			hScale = (winH)/h;
			wScale = (winW)/w;

			pScale = Math.min(hScale, wScale);

			fitW = Math.round(w*pScale);
			fitH = Math.round(h*pScale);

			marginL = Math.round((winW-fitW)/2);
			marginT = Math.round((winH-fitH)/2);

			ovlH  = fitH;
			ovlW  = fitW;
			
			ovlT  = marginT;
			ovlL  = marginL;	
		}
		

		$wrp.sizeandcenter(wrpW, wrpH, wrapMarginT, wrapMarginL, animateWrapper);
		$ovl.sizeandcenter(ovlW, ovlH, ovlT, ovlL, false); 
		$img.sizeandcenter(fitW, fitH, marginT, marginL, animateResize);

	},
	'reset' : function() {

		if(WPIV._autoTimer) clearTimeout(WPIV._autoTimer);

		jQuery(document).off('keyup');
		jQuery(document).off('kedown');	
		
		//remove everything that was created, including events bound to the elements
		WPIV._el.underlay.remove(); 

		//if activated from single post page go to the single post page for current image
		if(WPIV._pageType === "single" && (WPIV._slideNumber !== WPIV._initialSlide))
		{
			window.location.href = WPIV._siteUrl+"?p="+wpiv_postarray[WPIV._slideNumber][0];
		}else{
			jQuery('html').css({"height":WPIV._initialHtmlH});
			jQuery('body').css({"height":WPIV._initialBodyH});			
			jQuery('html, body').css({"overflow":"visible"});			
			jQuery("html, body").scrollTop(WPIV._lastScrollPos);
		}
	}
} // end of object literal
jQuery.fn.extend({
    sizeandcenter: function (w,h,t,l,a) {
		if(a) this.animate({"width":w,"height":h,"top":t,"left":l},300);
		else
		this.css({"width":w,"height":h,"top":t,"left":l});

		return this;
    }
});

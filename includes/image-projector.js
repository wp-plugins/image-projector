/**
 * Plugin Name: Image Projector
 * Plugin URI: http://www.lystfotograf.net/imageprojector
 * Description: A swift viewer and slideshow for the first image in published posts. 
 * Version: 1.5
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

			return(! WPIV.start(jQuery(this)));
			
		});
	}

});	
"use strict";
var WPIV = WPIV || {} 
WPIV = {

	DND				: 0, // DoNotDisturb

	captionON		: false,
	menuON			: 0,
	
	numSlides		: 0,
	initSlide		: 0,	
	slideNum		: 0,
	
	foundMenu		: 0,
	lastScrollPos	: 0,
	lastNavigation 	: 0,
	viewStyle		: 1,
	bckStyle		: 1,
	autoTimer		: null,
	autoDo			: false,

	initialBodyH	: '',
	initialHtmlH	: '',
	captions		: Array(),
	allPosts		: false,
	slowTImer		: 0,
	progTimer		: 0,
	menuHeight		: 0,
	
	// DOM element cache 'el'
	el				: Array(),
	imageDeck		: Array(),

	threeD			: false,
	transitionEnd	: '',
	
		
	transitionStyle	: 0,
	TRANS_CROSSFADE	: 1,
	TRANS_FADESLIDE	: 2,
	TRANS_SLIDESLIDE: 3,
	
    'cfg' : {

		'menuOverlay'		: true,
		'menuHeight'		: 50,
		'autoDuration'		: 3,  // secs	
		'parr'				: Array(),
		'postString'		: '',
		'wpUploadUrl'		: '',
		'wpPluginUrl'		: '',
		'expectedLoadtime'	: 6,  // secs	
		'slowMessage'		: 'Slow network or large image file? You may wait to see if the image appears or refresh page...',
		'fadeDuration'		: 500, // milliseconds
		'doNotScaleUp'		: false,
		'captions'			: false,
		'version'			: '',
		'showArrows'		: true,
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

				WPIV.allPosts 	= true;
			}
	},	
	'start' :function($initimage){

		if (typeof wpiv_postarray === 'undefined') {
			return (false);
		}
			
		var winW 		= jQuery(window).width();
		var winH 		= jQuery(window).height();
		var retVal		= false;
		
		// default view style on small screens
		if ((winH <801 && winW  <601) || (winH  <601 && winW  <801)) WPIV.viewStyle = 4;
		

		
		if( WPIV.connectpost($initimage)) {
			WPIV.initSlide 			= WPIV.slideNum;
			WPIV.lastNavigation		= 1; // this will preload next post
			WPIV.transDuration		= Math.round(10*parseInt(WPIV.cfg.fadeDuration)/1000)/10;
			WPIV.transitionStyle	= WPIV.TRANS_FADESLIDE;
			WPIV.menuHeight			= parseInt(WPIV.cfg.menuHeight);
			WPIV.getfromcookie();
			WPIV.setup();
			WPIV.setupEventHandlers();
			WPIV.show(true);
			
			if(WPIV.cfg.captions) {
				WPIV.loadcaptions();
			}
			if(!WPIV.captionON) {
				if(!WPIV.foundMenu) WPIV.showmenu(true);
			}
			
			if(WPIV.hasThreeD()){
				WPIV.threeD = true;
			}
			
			WPIV.transitionEnd = WPIV.hasTransitionEnd();
				
			retVal = true;
			
		}
		
		return retVal;	
	
	 
	},
	'connectpost' : function (img) {

		var totalPosts 		= wpiv_postarray.length;
		var in_Image 		= img.attr("src");		
		var in_GlobalSeqno	= null;

		WPIV.numSlides = ( ! WPIV.allPosts) ? WPIV.cfg.parr.length - 1 : totalPosts - 1;

		in_GlobalSeqno = img.data("seqno");
		if( ! in_GlobalSeqno){

			var in_PostID = null;
			in_PostID = img.data("postid");
			
			if(in_PostID > 0 ) {
				for (var i = 1; i < totalPosts; i++) {
				if (in_PostID === WPIV.getpostid(i)) {
						in_GlobalSeqno = i;
						break;
					}				
				} 
			}else if (in_Image.length > 0) {
				for (var i = 1; i < totalPosts; i++) {
				if (in_Image.lastIndexOf(WPIV.getsrc(i)) !== -1) {
						in_GlobalSeqno = i;
						break;
					}				
				}	
			}else {
				return (false); 
			}
		}

		if(in_GlobalSeqno) 
		{
			if(WPIV.numSlides === 1) {
				WPIV.cfg.parr[1] 	= in_GlobalSeqno;
				WPIV.slideNum 		= 1;
			} else if( ! WPIV.allPosts ) {
				for (var i = 1; i < WPIV.cfg.parr.length; i++) {
					for (var j = 1; j < totalPosts; j++) {
						if (WPIV.cfg.parr[i] === WPIV.getpostid(j))
						{
							WPIV.cfg.parr[i] = j; // replace postid with global sequence no
							break;
						}
					}
					if (WPIV.cfg.parr[i] === in_GlobalSeqno)
					{
						WPIV.slideNum = i;
					}	
				}

			}else {
				WPIV.slideNum = in_GlobalSeqno;
			}
		} else {
			return false;
		}
		return true;
	},
	'getpostid' : function(sno) {
		return wpiv_postarray[sno][0];
	},
	'getsrc' : function(sno) {
		return wpiv_postarray[sno][3];
	},
	'getcaption' : function(postid) {
		return (WPIV.captions[postid]+'  ('+WPIV.slideNum+"/"+WPIV.numSlides+') '+postid);
	},
	'loadcaptions' : function() {

		var jfile = WPIV.cfg.wpPluginUrl+'/ref/wpiv_ref_c_'+WPIV.cfg.version+'.json';
		var sno, caption, href, postid;
		jQuery.getJSON( jfile, function( data ) {
			jQuery.each( data, function( key, val ) { 
				WPIV.captions[key]=val;
			});
			sno 	= ( ! WPIV.allPosts) ? WPIV.cfg.parr[WPIV.slideNum] : WPIV.slideNum;
			postid	= WPIV.getpostid(sno);
			caption = WPIV.getcaption(postid);

			WPIV.el.caption.html(caption);	
		
		});
		
	},
	'setup': function(){

		WPIV.menuON = false;
		WPIV.BUSY(false);

		// it is impossible to store an option variable in the db with false as value so 2 is used instead
		if(WPIV.cfg.menuOverlay 	!= 1 ) WPIV.cfg.menuOverlay = false;
		if(WPIV.cfg.captions 		!= 1 ) WPIV.cfg.captions 	= false;
		
		// cache initial settings for later restore
		WPIV.initialHtmlH 		= jQuery('html').css("height");			
		WPIV.initialBodyH 		= jQuery('body').css("height");


		// make body fit browser window with no scrollbars
		var offs = window.pageYOffset;
		if(offs === 0) offs = jQuery('body').scrollTop();
		WPIV.lastScrollPos = offs;

		jQuery('html').css({"height":"100%","width":"100%"});
		jQuery('html, body').scrollTop(0);
		jQuery('html, body').css({"overflow":"hidden"});
		jQuery('body').css({"height":"100%","width":"100%"});
	
		ipPrependTo = 'body';
		ipClass 	= 'wpiv_underlay_full';	
		

		// underlay, the container for all elements
		WPIV.el.underlay = jQuery('<div></div>')
			.attr({'id':'wpiv_underlay'})
			.prependTo(ipPrependTo)
			.addClass(ipClass);
	
		if(WPIV.bckStyle === 1) {
			WPIV.el.underlay.addClass('wpiv_underlay_one')
		} else {
			WPIV.el.underlay.addClass('wpiv_underlay_two')
		}
		
		// image wrapper 
		WPIV.el.wrapper = jQuery('<div></div>')
			.attr('id','zoomcontainer')
			.css({"position":"relative",'overflow':'hidden'})
			.appendTo(WPIV.el.underlay);
		
		// add two img elements to switch between, inside the image wrapper
		for (var i = 0; i < 2; i++) {
			WPIV.imageDeck[i] = jQuery('<img/>')
			.attr({id:'wpiv_img_'+i,'src':WPIV.cfg.wpPluginUrl+'/img/wpiv-theimage.gif',
			"width":1,"height":1})
			.css({'position':'absolute','opacity':'0'})
			.addClass('forceGPU') // maybe not necessary...
			.appendTo(WPIV.el.wrapper);
		}

		// an overlay to hold a busy-loading indicator if necessary
		WPIV.el.overlay = jQuery('<div></div>').attr('id','wpiv_ovl')
		.css({'width':'100%','height':'100%','text-align':'center'}) // initial size and position
		.appendTo(WPIV.el.underlay);
		
		// slow loading message
		WPIV.el.slowText = jQuery('<div>'+WPIV.cfg.slowMessage+'</div>').attr('id','wpiv_ovl_text')
		.appendTo(WPIV.el.overlay);	

		// menu and other items
		jQuery('<div id="wpiv_menu" class="menu"><ul ><li id="wpiv_bck" class="wpiv_cmd" unselectable="on"><i class="material-icons md-sz mi-align">&#xE3AB;</i></li><li id="wpiv_view" class="wpiv_cmd"  unselectable="on" ><i class="material-icons md-sz mi-align">&#xE3C2;</i></li><li id="wpiv_play" class="wpiv_cmd" unselectable="on" ><i class="material-icons md-sz mi-align">&#xE037;</i></li><li id="wpiv_exit" class="wpiv_cmd" unselectable="on"><i class="material-icons md-sz mi-align">&#xE5CD;</i></li></ul></div>')
			.css({"width":"100%","min-width":"300px","overflow":"hidden",
			"height":WPIV.menuHeight,
			"position":"absolute","bottom":WPIV.menuHeight*-1,"left":"0px","cursor":"pointer","z-index":"1050"})
			.appendTo(WPIV.el.underlay);
	
		if(WPIV.cfg.captions) {
			jQuery('<li id="wpiv_caption_switch" class="wpiv_cmd"  unselectable="on" ><i class="material-icons md-sz mi-align">&#xE048;</i></li>')
				.prependTo('#wpiv_menu>ul');
		} else{
			jQuery('<li id="wpiv_imginfo"  unselectable="on" ></li>')
				.prependTo('#wpiv_menu>ul');
		}
		WPIV.el.bckswitch   	= jQuery("#wpiv_bck");
		WPIV.el.captionswitch 	= jQuery("#wpiv_caption_switch");
		WPIV.el.menu			= jQuery("#wpiv_menu");
		WPIV.el.counter			= jQuery("#wpiv_imginfo");
		WPIV.el.style			= jQuery("#wpiv_view");
		WPIV.el.auto			= jQuery("#wpiv_play");
		WPIV.el.exit			= jQuery("#wpiv_exit");

		
		jQuery("div#wpiv_menu ul li").css({"width":"20%","line-height":WPIV.menuHeight+"px"});


		// caption support, if set in plugins admin menu
		if(WPIV.cfg.captions) {	
			jQuery('<div id="wpiv_caption" unselectable="on"></div>')
				.css({"width":"100%","overflow":"hidden","text-overflow":"ellipsis","white-space":"nowrap","height":WPIV.menuHeight,"z-index":"1040",
				"position":"absolute","bottom":WPIV.captionON === false?WPIV.menuHeight*-1:0,"line-height":WPIV.menuHeight+"px"})
				.appendTo(WPIV.el.underlay);
				
			WPIV.el.caption = jQuery("#wpiv_caption");
			if(WPIV.captionON) {WPIV.el.caption.show();}else {WPIV.el.caption.hide();}
		}
		 
		// do not allow auto-advance when one post, neutralize the button
		if(WPIV.numSlides < 2) { 
			WPIV.el.auto.removeClass("wpiv_cmd");
			WPIV.el.auto.addClass("wpiv_cmd_inactive");		
		}		
		// next and prev button as defined in stylesheet	
		WPIV.el.next= jQuery('<div id="wpiv_next" class="arrow_next"></div>').hide().appendTo(WPIV.el.underlay);
		WPIV.el.prev= jQuery('<div id="wpiv_prev" class="arrow_prev"></div>').hide().appendTo(WPIV.el.underlay);
	
		// auto-advance indicator as defined in stylesheet
		WPIV.el.running=jQuery('<div title="Running slides"></div>')
			.attr({id:'wpiv_running'})
			.appendTo(WPIV.el.underlay);
	 
		// an image element to store preloaded image
		WPIV.el.preloadNext = jQuery('<img/>')
			.attr({alt:'Preload next',	src:'',id:'wpiv_preload_next'})
			.css({"display":"none" })
			.appendTo(WPIV.el.underlay);
			
		// set up default view style
		WPIV.switchview(WPIV.viewStyle);
		
		// position the next/prev arrows
		WPIV.positionarrows();

		return;
	},
	'BUSY' : function(newstatus) {
		if(typeof newstatus === 'undefined')
		{
			return WPIV.DND;
		}
		if (newstatus === false) {
			WPIV.DND = false;

			if(WPIV.pendingResize) {
				WPIV.pendingResize = false;
				WPIV.windowresize();

				}
		} else {
			WPIV.DND = true;

		}
	},
	'show'	: function(isinit) {
		if(WPIV.DND) return;
		
		WPIV.BUSY(true);

		if(isinit != true)	{
			isinit = false;
		}		
		var useCrossFade = false;
		var imgNext, imgCurr, imgURL, sno, wn, hn, nextFinish, currFinish;
		
				
		sno =  (! WPIV.allPosts) ? WPIV.cfg.parr[WPIV.slideNum] : WPIV.slideNum;		
	
		var evList 			= 'webkitTransitionEnd otransitionend oTransitionEnd msTransitionEnd transitionend';
		var postID			= WPIV.getpostid(sno);
		var src 			= WPIV.getsrc(sno);
		var wn 				= wpiv_postarray[sno][1];
		var hn 				= wpiv_postarray[sno][2];
		var slideDuration 	= 0.4;
		var optrans 		= 'opacity '+WPIV.transDuration+'s linear';
		var slidetrans 		= 'left ' + slideDuration + 's linear';

		WPIV.progTimer 		= setTimeout(function () {WPIV.showloader()}, 300);

		// build src attribute for image
		if(src.indexOf("http") < 0)
		{	// file on your domain, path relative to wp upload dir
			imgURL 	= WPIV.cfg.wpUploadUrl + src;
		}else {
			imgURL 	= src;
		}
		
		imgCurr = WPIV.imageDeck[0];
		// rotate array
		WPIV.imageDeck.unshift(WPIV.imageDeck.pop());
		imgNext = WPIV.imageDeck[0];
		
		// for Firefox, set src to blank first to trigger imagesloaded
		imgNext.attr({src:''}).data({"seqno":WPIV.slideNum});
		if(wn > 0 && hn > 0) {
			imgNext.attr({'src':imgURL,'width':wn,'height':hn});
			WPIV.fitimage(0, imgNext);
		}
									

		imgCurr.css({'z-index':'1005','transition':'none','transform':'none'});
		
		var imgLoad = imagesLoaded( imgNext); 

		imgLoad.on( 'done', function( instance ) {

			clearTimeout(WPIV.slowTimer);
			clearTimeout(WPIV.progTimer);
			WPIV.el.overlay.css("background-image","none");
			WPIV.el.slowText.hide();

			if((!wn || !hn ) || (wn < 2 || hn < 2)) { 
				// no image dimensions set - get it now when image is loaded
				wn = imgLoad.images[0].img.naturalWidth;
				hn = imgLoad.images[0].img.naturalHeight;
				imgNext.attr({'width':wn,'height':hn});
				WPIV.fitimage(0, imgNext);				
			}

			
			nextFinish = currFinish = false;

			
			
			if(!isinit && WPIV.transitionEnd != '') {
				// set up transition end event listeners
				imgCurr.one(WPIV.transitionEnd, function(event) {
					imgCurr.css({'left':wrapW,'opacity':'0','transition':'none','transform':'none'});
					currFinish = true;
					if(nextFinish) {
					 	WPIV.BUSY(false);
					} 
				
					
				});
				imgNext.one(WPIV.transitionEnd, function(event) {
					imgNext.css({'transition':'none','transform':'none','left':wrapW-nextDelta});
					
					nextFinish = true;
					 if(currFinish) {
						WPIV.BUSY(false);
					 }
					
					if(WPIV.cfg.captions) {
						WPIV.el.caption.html(WPIV.getcaption(postID));	
					}else {
						WPIV.el.counter.html(WPIV.slideNum+" / "+WPIV.numSlides);
					}


					
				});		
			}
			if(WPIV.transitionStyle === WPIV.TRANS_CROSSFADE || isinit) {
				imgNext.css({'opacity':'1','transition': optrans});
				imgCurr.css({'opacity':'0','transition': optrans});
				if(isinit) {
					WPIV.BUSY(false);
					}
		
			} else {
				var wrapW 		= WPIV.el.wrapper.outerWidth();
				var nextW 		= imgNext.outerWidth();
				var currW 		= imgCurr.outerWidth();
				var nextDelta 	= Math.round((wrapW + nextW)/2);
				var currDelta 	= Math.round((wrapW + currW)/2);
				var shiftNextX 	= (WPIV.lastNavigation > -1 ) ? -1 * nextDelta : nextDelta;
				var shiftCurrX 	= (WPIV.lastNavigation > -1 ) ? -1 * currDelta : currDelta;
				
				// to get same speed for in and outgoing image
				var durationOut = slideDuration + slideDuration * ((shiftCurrX - shiftNextX) / shiftNextX);
				
				// set start position for slide transition of next image
				var l = (WPIV.lastNavigation > -1 ) ? wrapW : -1 * nextW;
		
				// translateX. Translate3D does not exist for some browser versions (Opera12 for instance).
				var trans;
				if(WPIV.threeD) {
					transIn 	= 'translate3D('+shiftNextX + 'px,0px,0px)';
					transOut 	= 'translate3D('+shiftCurrX + 'px,0px,0px)';
				} else {
					transIn 	= 'translateX('+shiftNextX + 'px)';
					transOut 	= 'translateX('+shiftCurrX + 'px)';
				}
				imgNext.css({'z-index':'1010','opacity':'1','left':l,
				'transition':'transform ' + slideDuration + 's  ease','transform':transIn
				});
				if(WPIV.transitionStyle === WPIV.TRANS_SLIDESLIDE) { 
					imgCurr.css({'transition':'transform ' + durationOut + 's  ease','transform':transOut});
				} else {		
					imgCurr.css({'opacity':'0', 'transition': 'opacity 0.2s linear'});
				}
			}
			// preload
			
			WPIV.el.preloadNext.attr({'src': WPIV.preload()});
			
		});

	},
	'showloader' : function() {
		
		WPIV.el.overlay.css("background-image","url('"+WPIV.cfg.wpPluginUrl+"/img/wpiv-loader.gif')");
		WPIV.slowTimer = setTimeout(function () {showSlow()}, parseInt(WPIV.cfg.expectedLoadtime)*1000);
		
		function showSlow() {
			WPIV.el.slowText.show();
		}
	},
	'preload':function() {
		if(WPIV.numSlides < 2)
			return false;
			
		var preloadSlide, preloadSno, preloadUrl;
		
		preloadSlide 	= WPIV.lastNavigation > -1 ? WPIV.getnext() : WPIV.getprev();
		preloadSno		= ! WPIV.allPosts ? WPIV.cfg.parr[preloadSlide] : preloadSlide;
		preloadUrl 		= WPIV.cfg.wpUploadUrl+WPIV.getsrc(preloadSno);
		
		return preloadUrl;
		
	},
	'setupEventHandlers': function(){
	
		var mc = new Hammer.Manager(document.body, {
			recognizers: [[Hammer.Pan, { threshold: 10,direction: Hammer.DIRECTION_HORIZONTAL }]]
		});
	
		mc.on("panstart", function(ev) {
			direction = ev.direction;

			if (direction == Hammer.DIRECTION_LEFT){
				WPIV.navigate(1);
			}else if(direction == Hammer.DIRECTION_RIGHT){
				WPIV.navigate(-1);
			}
		});
		mc.on("tap", function(ev) {
	
				WPIV.showmenu( ! WPIV.menuON);
				WPIV.foundMenu = true;		
		});

		

		// trace click in window, depending on location - navigate or toggle menu
		WPIV.el.underlay.on('click', function(event) {

			if( WPIV.BUSY()) return;
			
			event.preventDefault();
			var scrollLeft	= jQuery(window).scrollLeft();
			var scrollTop	= jQuery(window).scrollTop();	

	
			var winW 		= WPIV.el.underlay.width();
			var winH 		= WPIV.el.underlay.height();
			
			var clickX, clickY, clickWidth;
			
			clickX = event.pageX;
			clickY = event.pageY;
 
			var underlayOffset = WPIV.el.underlay.offset();
			
			
			var clickX = clickX - underlayOffset.left;
			var clickY = clickY - underlayOffset.top;


			// if only one slide, only possible action is toggling menu - no next/prev 
			if(WPIV.numSlides === 1) {
				WPIV.showmenu( ! WPIV.menuON)
				return;
			}	

			// bottom of screen
			var clickHMax = winH + scrollTop;
			
			// bottom of next/previous click area
			var clickHMin = clickHMax - WPIV.menuHeight;

			// width of next/previous click area, a bit larger when width of window is small	
			if((winW-scrollLeft) < 320) {clickWidth = 0.3*winW;} else {clickWidth = 0.2*winW;}


			// previous
			if( clickX - scrollLeft < clickWidth && clickY < clickHMin) {
				WPIV.navigate(-1);
			}
			// next
			else if (clickX + scrollLeft > winW - clickWidth && clickY < clickHMin) {
				WPIV.navigate(1);
			}else {
				// toggle menu
				WPIV.showmenu( ! WPIV.menuON);
				WPIV.foundMenu = true;
			}
			return;
		});
		// switch style button (view)
		 WPIV.el.style.on('click', function(event) {
			event.stopPropagation();		 
			WPIV.switchview();
			WPIV.fitimage();
			WPIV.savetocookie();
		});
		// exit button
		 WPIV.el.exit.on('click', function(event) {
			event.stopPropagation();
			mc.off("panstart");
			WPIV.reset();
		
		});
		// caption button
		 WPIV.el.captionswitch.on('click', function(event) {
			event.stopPropagation();
			WPIV.showcaptions( ! WPIV.captionON);
			WPIV.showmenu( ! WPIV.menuON);
		
		});
		// background button
		 WPIV.el.bckswitch.on('click', function(event) {
			event.stopPropagation();
			WPIV.switchbackground();
			WPIV.savetocookie();
		});		
		// auto-advance button
		 WPIV.el.auto.on('click', function(event) {
			event.stopPropagation();
			WPIV.startstop();
		}); 
		// keys, disable down/up arrow keydown to avoid scrolling
		jQuery(document).on('keydown', (function(e) {

			if (e.keyCode === 40 || e.keyCode === 38) {
				return false;
			}
		}));
		// keys, shortcut keys
		jQuery(document).on('keyup', (function(e) {
			e.stopPropagation();

			switch (e.keyCode) {
				case 49: // 1
					WPIV.transitionStyle = WPIV.TRANS_CROSSFADE;
					
					break;
				case 50: // 2
					WPIV.transitionStyle = WPIV.TRANS_FADESLIDE;
					
					break;
				case 51: // 3
					WPIV.transitionStyle = WPIV.TRANS_SLIDESLIDE;
					
					break;
				case 88: // X - eXit
					mc.off("panstart");
					WPIV.reset();
					break;
				case 65: // A - Auto
					WPIV.startstop();
					break;
				case 37: // Left arrow
				case 80: // P - Previous
					if(WPIV.numSlides > 1) WPIV.navigate(-1);
					break;
				case 39: // Right arrow
				case 78: // N - Next
					if(WPIV.numSlides > 1) WPIV.navigate(1);
					break;
				case 76: // L - Last
					if( ! WPIV.BUSY()) {
						WPIV.slideNum = WPIV.numSlides;
						WPIV.show();
					}								
					break;
				case 40: // Down arrow
					if (WPIV.menuON) {WPIV.foundMenu = true;WPIV.showmenu(false);}
					break;
				case 38: // Up arrow
					if ( ! WPIV.menuON) {WPIV.foundMenu = true;WPIV.showmenu(true);}			
					break;
				case 83: // S - Style
				case 86: // V - View
				case 89: // Y - stYle
					WPIV.switchview();
					WPIV.fitimage();
					WPIV.savetocookie();					
					break;
				case 66: // B - Background
					WPIV.switchbackground();
					WPIV.savetocookie();
					break;
				case 67: // C - Captions
					if (WPIV.cfg.captions) {
						WPIV.showcaptions( ! WPIV.captionON);
					}		
					break;
			}
		})); 

		// handle resize window event
		jQuery( window ).on('resize', (function(e) {
			WPIV.windowresize();
		})); 
	
	},
	'positionarrows'		: function(){
		if(! WPIV.cfg.showArrows) return;
		
		var availH 	= WPIV.el.underlay.height();
		var sz		= WPIV.el.next.outerHeight();
		
		if(WPIV.menuON || WPIV.captionON) {
			availH = availH - WPIV.menuHeight;
		}
		
		var top 		= Math.round((availH - sz) / 2);
		
		// assuming height of prev and next arrow is same-same
		WPIV.el.prev.css({"top": top});
		WPIV.el.next.css({"top": top});
	},
	'navigate': function(direction) {
		if( WPIV.BUSY()) {return;}
		WPIV.slideNum = (direction > 0) ? WPIV.getnext(): WPIV.getprev();
		WPIV.show();
	},
	'getnext'	: function() {	
		WPIV.lastNavigation = 1;
		return((WPIV.slideNum + 1 > WPIV.numSlides) ? 1 : WPIV.slideNum + 1);
	},
	'getprev'	: function() {
		WPIV.lastNavigation = -1;
		return((WPIV.slideNum - 1 < 1) ? WPIV.numSlides : WPIV.slideNum - 1);			
	},
	'showmenu'	: function(showit) {

		WPIV.BUSY(true);
		
		WPIV.menuON = showit ? true:false;
		
		if( ! WPIV.cfg.menuOverlay && !WPIV.captionON ) {
			WPIV.fitimage(1); // 1 = smooth
		}
		
		if(showit) {
			WPIV.el.menu.show();

			WPIV.el.menu.animate({
					bottom: "+="+WPIV.menuHeight,
				}, 300, function() {
					WPIV.BUSY(false);
					WPIV.showarrows(true);
					WPIV.positionarrows();
					
				}
			);

			if( WPIV.autoDo) WPIV.el.running.hide();

		}
		else {
			WPIV.showarrows(false)
			WPIV.el.menu.animate({
					bottom: "-="+WPIV.menuHeight,
				}, 300, function() {
					WPIV.BUSY(false);
					WPIV.el.menu.hide();
					WPIV.positionarrows();
				}
			);

			if( WPIV.autoDo) WPIV.el.running.show();
			
		}

		return;
	},
	'showcaptions'	: function(showit){
		if(WPIV.BUSY()) return;
	
		WPIV.BUSY(true);
		
		var ovl  = WPIV.cfg.menuOverlay;
		WPIV.captionON = showit ? true:false;

		 if((!WPIV.menuON && ! ovl) || ovl) {
			WPIV.fitimage(1);
		} 
		 
		if(showit) {
			WPIV.el.caption.show();
			WPIV.el.caption.animate(
				{bottom: "+="+WPIV.menuHeight
				},
				300, function() { WPIV.BUSY(false);}
			);

		}else{
			WPIV.el.caption.animate(
				{bottom: "-="+WPIV.menuHeight},
				300, function() { WPIV.BUSY(false);WPIV.el.caption.hide();}
			);
		}

	},
	'showarrows' : function (showit) {
		if(! WPIV.cfg.showArrows) return;
		if(WPIV.numSlides < 2) return;
		
		if(showit) {
				WPIV.el.next.show();
				WPIV.el.prev.show();				
			}else {
				WPIV.el.next.hide();
				WPIV.el.prev.hide();					
		}
	
	},
 	'startstop'	: function() {
		if(WPIV.numSlides < 2) return;
		
		var cname 	= "wpiv_auto_running";
		
		
		if( ! WPIV.BUSY() || WPIV.autoDo) { // if busy, it can only be stopped
			if( ! WPIV.autoDo) {
					WPIV.autoDo = true;

					WPIV.el.auto.addClass(cname);
					jQuery("#wpiv_play i").html('&#xE047;');

					WPIV.el.running.show();
				
					if (WPIV.menuON) WPIV.showmenu(false);
					autoNext();
				} else {
					WPIV.el.running.hide();			

					WPIV.el.auto.removeClass(cname);
					jQuery("#wpiv_play i").html('&#xE037;');

					WPIV.autoDo = false;
					clearTimeout(WPIV.autoTimer);
					WPIV.autoTimer = null;
				}
				

		}
		function autoNext() {
			if(WPIV.autoDo) {
			
				WPIV.autoTimer = setTimeout(function(){
						if( ! WPIV.autoDo) { 
							clearTimeout(WPIV.autoTimer);
							WPIV.autoTimer = null;
						}else
						{
							if( ! WPIV.BUSY()) WPIV.navigate(1);
						}
				autoNext();

				}, parseInt(WPIV.cfg.autoDuration)*1000);
			}
		
		}		
		return;
	},
	'switchbackground'	: function() {
		var el = WPIV.el.underlay;
		var one = 'wpiv_underlay_one';
		var two = 'wpiv_underlay_two';
		WPIV.bckStyle = (WPIV.bckStyle === 1) ? 2 : 1;

		
		if(WPIV.bckStyle === 2) {
			el.removeClass(one);
			el.addClass(two);
		}else
		{
			el.removeClass(two);
			el.addClass(one);	
		}

	},	
	'windowresize' : function() {
		if(WPIV.BUSY()) {
			WPIV.pendingResize = true;
			return;
		}
		
		WPIV.fitimage();
		WPIV.positionarrows();

	},
	
	'switchview': function(viewno) {
		if(WPIV.BUSY()) return;

		var wrp  = WPIV.el.wrapper;
		var b 	= 'wpiv_view_border'
		
			if(typeof viewno === 'undefined') {
				if(WPIV.viewStyle === 3) { // remove old border class
					for(var i = 0;i < WPIV.imageDeck.length; i++) WPIV.imageDeck[i].removeClass(b);
				}
				if(WPIV.viewStyle < 4) WPIV.viewStyle++; else WPIV.viewStyle = 1;

			} else WPIV.viewStyle = viewno;
			
			wrp.removeClass();
		
			switch(WPIV.viewStyle) {
				case 1: wrp.addClass('wpiv_view_square_one');break;
				case 2: wrp.addClass('wpiv_view_square_two');break;
				case 3: for(var i = 0;i < WPIV.imageDeck.length; i++) WPIV.imageDeck[i].addClass(b);
						break;
				case 4: // no partucluar setting at the moment
						break;			
			}

	},

	'fitimage' : function(anim, $img) {

		var scrollTop 	= 0;
		var winMarginH	= 40;
		var winMarginW	= 60;
		var topMenu		= 0;
		var mh 			= parseInt(WPIV.menuHeight);
		
		winW = jQuery(window).width();
		winH = jQuery(window).height();

		if( (! WPIV.cfg.menuOverlay && WPIV.menuON) || WPIV.captionON) {
			winH = winH - mh - topMenu;
			if( WPIV.cfg.showArrows) winMarginW	= 100;
		}	

		
		var $ovl, $wrp, w, h,hScale, wScale, pScale, fitH, fitW, marginL, marginT, wrpH, wrpW, wrapMarginL, wrapMarginT, ovlT, ovlL, ovlW, ovlH, animateWrapper;

		$ovl = WPIV.el.overlay;
		$wrp = WPIV.el.wrapper;

		if(typeof $img === 'undefined')	$img = WPIV.imageDeck[0];
		if(typeof anim === 'undefined') anim = 0;
		
		wrapMarginL = 0;
		wrapMarginT = 0 + scrollTop;
		animateWrapper = false;
		wrpW = wrpH = '100%';
		wrapMarginL = wrapMarginT = 0;
			
		w = $img.attr("width");
		h = $img.attr("height");
		
		if(WPIV.viewStyle === 1 || WPIV.viewStyle === 2)
		{
			// inside square
			var winSquare=Math.min(winW-winMarginW, winH-winMarginH);
			hScale = (winSquare)/h;
			wScale = (winSquare)/w;
			
			pScale = Math.min(hScale, wScale);

			fitW = Math.round(w*pScale);
			fitH = Math.round(h*pScale);
			
			marginL = Math.round((winSquare-fitW)/2);
			marginT = Math.round((winSquare-fitH)/2);
			
			wrapMarginL = Math.round((winW-winSquare)/2);
			wrapMarginT = Math.round((winH-winSquare)/2) + scrollTop + topMenu;
			
			
			
			ovlH = ovlW = winSquare;
			ovlT  = wrapMarginT;
			ovlL  = wrapMarginL;
			
			wrpH = wrpW = winSquare;
			
			if(anim) animateWrapper = true;
		}
		
		else if (WPIV.viewStyle === 3)
		{
			// with border
			var b  = Math.round(($img.outerWidth()-$img.innerWidth())/2);
			var bb = 2*b;
	
			hScale = (winH-winMarginH-bb)/(h+bb);
			wScale = (winW-winMarginW-bb)/(w+bb);
				
			pScale = Math.min(hScale, wScale);

			fitW = Math.round((w+bb)*pScale);
			fitH = Math.round((h+bb)*pScale);
			
			marginL = Math.round((winW-fitW)/2)- b;
			marginT = Math.round((winH-fitH)/2)- b + topMenu;

			ovlH  = fitH+bb;
			ovlW  = fitW+bb;
			
			ovlT  = marginT;
			ovlL  = marginL;
		}		
		else {
			// full throttle!
			hScale = (winH)/h;
			wScale = (winW)/w;

			pScale = Math.min(hScale, wScale);

			fitW = Math.round(w*pScale);
			fitH = Math.round(h*pScale);

			marginL = Math.round((winW-fitW)/2);
			marginT = Math.round((winH-fitH)/2) + topMenu;

			ovlH  = fitH;
			ovlW  = fitW;
			
			ovlT  = marginT;
			ovlL  = marginL;
			
		}

		$wrp.sizeandcenter(wrpW, wrpH, wrapMarginT, wrapMarginL, animateWrapper);
		$ovl.sizeandcenter(ovlW, ovlH, ovlT, ovlL, false); 
		$img.sizeandcenter(fitW, fitH, marginT, marginL, anim);

	},
	'savetocookie' : function ()	{
		var arr;
		
		arr = [WPIV.viewStyle, WPIV.captionON, WPIV.foundMenu, WPIV.bckStyle];
		
		var arrstr = JSON.stringify(arr);
		document.cookie = "_imageprojector" + "=" + arrstr + "" + "; expires=Fri, 31 Dec 9999 23:59:59 GMT; path=/";
	},
	'getfromcookie' : function () {
		var json_str = WPIV.getcookie('_imageprojector');
		
		if(json_str !== "") {

			var arr = JSON.parse(json_str);
			if(arr.length === 4){   
				WPIV.viewStyle	= arr[0];
				WPIV.captionON	= arr[1];
				WPIV.foundMenu	= arr[2];
				WPIV.bckStyle	= arr[3];
			}
		}
	},
	'getcookie' : function (c_name){
		if (document.cookie.length > 0) {
			c_start = document.cookie.indexOf(c_name + "=");
			if (c_start != -1) {
				c_start = c_start + c_name.length + 1;
				c_end = document.cookie.indexOf(";", c_start);
				if (c_end == -1) {
					c_end = document.cookie.length;
				}
				return unescape(document.cookie.substring(c_start, c_end));
			}
		}
		return "";

	},
	'reset' : function() {

		if(WPIV.autoTimer) clearTimeout(WPIV.autoTimer);
		WPIV.savetocookie();
		jQuery(document).off('keyup');
		jQuery(document).off('kedown');	
		
		// remove everything that was created, including events bound to the elements
		WPIV.el.underlay.remove(); 

		// if activated from single post page go to the single post page for current image
		if(jQuery('body').hasClass("single") && (WPIV.slideNum !== WPIV.initSlide))
		{

			window.location.href = window.location.protocol + "//" + window.location.host + "?p="+WPIV.getpostid(WPIV.slideNum);
		}else{

			jQuery('html').css({"height":WPIV.initialHtmlH});
			jQuery('body').css({"height":WPIV.initialBodyH});			
			jQuery('html, body').css({"overflow":"visible"});			
			jQuery("html, body").scrollTop(WPIV.lastScrollPos);
	
		}
	},
	'hasThreeD':	function() {
		// https://gist.github.com/lorenzopolidori/3794226
		
		if (!window.getComputedStyle) {
			return false;
		}

		var el = document.createElement('p'), 
			has3d,
			transforms = {
				'webkitTransform':'-webkit-transform',
				'OTransform':'-o-transform',
				'msTransform':'-ms-transform',
				'MozTransform':'-moz-transform',
				'transform':'transform'
			};

		document.body.insertBefore(el, null);

		for (var t in transforms) {
			if (el.style[t] !== undefined) {
				el.style[t] = "translate3d(1px,1px,1px)";
				has3d = window.getComputedStyle(el).getPropertyValue(transforms[t]);
			}
		}

		document.body.removeChild(el);

		return (has3d !== undefined && has3d.length > 0 && has3d !== "none");
	},

	'hasTransitionEnd': function ()  {
			// https://github.com/EvandroLG/transitionEnd
			
			var el = document.createElement('p');
			var	ret = '';
	        var transitions = {
                'WebkitTransition' : 'webkitTransitionEnd',
                'MozTransition'    : 'transitionend',
                'OTransition'      : 'oTransitionEnd otransitionend',
                'transition'       : 'transitionend'
            };
			
			document.body.insertBefore(el, null);
			
            for(var t in transitions){
                if(el.style[t] !== undefined){
					ret = transitions[t];
                }
            }
			document.body.removeChild(el);
			return (ret);
	}
} // end of object literal

jQuery.fn.extend({
    sizeandcenter: function (w,h,t,l,a) {
	
		if(a) {
			this.css({'transition':'none'}).animate({"width":w,"height":h,"top":t,"left":l},300);
		}
		else
		this.css({"width":w,"height":h,"top":t,"left":l,'transition':'none'});

		return this;
    }
});

// In case not supported in browser
// Production steps of ECMA-262, Edition 5, 15.4.4.14
// Reference: http://es5.github.io/#x15.4.4.14
if (!Array.prototype.indexOf) {
  Array.prototype.indexOf = function(searchElement, fromIndex) {

    var k;

    if (this == null) {
      throw new TypeError('"this" is null or not defined');
    }

    var O = Object(this);

    var len = O.length >>> 0;

    if (len === 0) {
      return -1;
    }

    var n = +fromIndex || 0;

    if (Math.abs(n) === Infinity) {
      n = 0;
    }

    if (n >= len) {
      return -1;
    }

    k = Math.max(n >= 0 ? n : len - Math.abs(n), 0);

    while (k < len) {
      if (k in O && O[k] === searchElement) {
        return k;
      }
      k++;
    }
    return -1;
  };
}

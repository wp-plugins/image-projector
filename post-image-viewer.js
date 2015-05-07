/**
 * Plugin Name: Image Projector
 * Plugin URI: http://www.lystfotograf.net/imageprojector
 * Description: A swift viewer and slideshow for the first image in published posts. Good for photographers. No gallery required. 
 * Version: 1.1
 * Author: Christian G
 * Author URI: http://www.lystfotograf.net
 * License: GPL2
*/
jQuery(document).ready(function( $ ) {

	if ( ! ( 'undefined' === typeof WPIVConfig ) )
		WPIV.settings(WPIVConfig);	
 
	//#outerwrapper>#tag_gallery>div>img.mimg, #postimg, .alignnone
	jQuery(WPIVConfig.bindto).bind('click', function( event ){
		//prevent following any anchors
		event.preventDefault(); 
		//de-select clicked element
		jQuery(event.target).parent().blur();
		//image src will be used as a fall-back to link image to global reference array
		WPIV._clickedImage = (jQuery(this).attr("src"));
		WPIV.start(jQuery(this));
	});

});	

"use strict";
var WPIV = WPIV || {} 
WPIV = {

	_arrowSize		: 0,
	_clickedImage	: '',
	_busyLoadingImg	: 0,

	_showMenu		: 0,
	_createMenu		: true,
	
	_numberOfSlides	: 0,
	_initialSlide	: 0,	
	_slideNumber	: 0,
	
	_lastScrollPos	: 0,
	_lastNavigation : 0,
	_viewStyle		: 1,
	_autoTimer		: null,
	_autoDo			: false,
	_pageType		: '',
	_initialBGColor	: '',
	_initialBodyH	: '',
	_initialHtmlH	: '',
	
	//DOM element cache
	_elZoomOvl		: null,
	_elMenu			: null,	
	_elMenuCounter	: null,
	_elMenuView		: null,	
	_elMenuAuto		: null,
	_elMenuExit		: null,		
	_elNext			: null,
	_elPrev			: null,
	_elImgA			: null,
	_elImgB			: null,
	_trans			: null,
    'cfg' : {

		'menuOverlay'		: true,
		'menuHeight'		: 50,
		'autoDuration'		: 4,  //secs	
		'parr'				: Array(),
		'postString'		: '',
		'wpUploadUrl'		: '',
		'wpPluginUrl'		: '',
		'expectedLoadtime'	: 5,  //secs	
		'slowMessage'		: 'Slow network or large image file? You may refresh page or wait to see if the image appears...',
		fadeDuration		: 700, //milliseconds
		doNotScaleUp		: true,

	},
	'settings' : function(cfg){
	
			if (cfg && typeof(cfg) === 'object') {
				jQuery.extend(WPIV.cfg, cfg);
			}
			if(WPIV.cfg.postString)
			{
				var arr=[];
				arr.push.apply(arr, WPIV.cfg.postString.split(",").map(Number));
				WPIV.cfg.parr = arr;
			}else {
				
				WPIV.cfg.parr = listArray;
			}
	},	
	'start' :function($initimage){

		WPIV._showMenu = false;
		WPIV._busyLoadingImg	= 0;
		if(WPIV.cfg.menuOverlay != 1) WPIV.cfg.menuOverlay = false;
		
		// cache initial settings for later restore
		WPIV._initialHtmlH 		= jQuery('html').css("height");			
		WPIV._initialBodyH 		= jQuery('body').css("height");
		WPIV._initialBGColor 	= jQuery('body').css("background-color");


		//make body fit browser window with no scrollbars
		var offs = window.pageYOffset;
		if(offs === 0) offs = jQuery('body').scrollTop();
		WPIV._lastScrollPos = offs;

		jQuery('html').css({"height":"100%","width":"100%"});
		jQuery('html, body').scrollTop(0);
		jQuery('html, body').css({"overflow":"hidden",});
		jQuery('body').css({"height":"100%","width":"100%"});
	
		//hide all elements below the underlay
		jQuery("body").children().fadeTo("fast",0);
		

		if(jQuery('body').hasClass("single")) {WPIV._pageType="single";}		
		
		//count the number of posts, disregarding array position [0]
		WPIV._numberOfSlides = WPIV.cfg.parr.length-1;
		
		var clickedGlobalSeqno = null;
		var totalPosts = seqArray.length;
		
		clickedGlobalSeqno = $initimage.data("seqno");
		if( ! clickedGlobalSeqno) {
			//find the sequence number (the post's row number in the database) for the clicked image
			//two attempts: by postid, by image file name
			var clickedPostID = null;
			clickedPostID = $initimage.data("postid");
			
			if(clickedPostID > 0 ) {
				for (var i = 1; i < totalPosts; i++) {
				if (clickedPostID === seqArray[i][0]) { //[0] is post id
						clickedGlobalSeqno = i;
						break;
					}				
				}

			}else if (WPIV._clickedImage.length > 0) {
				for (var i = 1; i < totalPosts; i++) {
				if (WPIV._clickedImage.lastIndexOf(seqArray[i][3]) !== -1) {//[3] is image filename
						clickedGlobalSeqno = i;
						break;
					}				
				}	
			}else {
				clickedGlobalSeqno = 1; // last resort
			}
		}

		
		if(WPIV._numberOfSlides === 1) {
			WPIV.cfg.parr[1] 	= clickedGlobalSeqno;
			WPIV._slideNumber 	= 1;
		}		
		else if(WPIV._pageType !== "single"){
	
			for (var i = 1; i < WPIV.cfg.parr.length; i++) {
				for (var j = 1; j < totalPosts; j++) {
					if (WPIV.cfg.parr[i] === seqArray[j][0])
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

		}else{
			WPIV._slideNumber = clickedGlobalSeqno;
		}
		
		WPIV._initialSlide 		= WPIV._slideNumber;
		WPIV._lastNavigation	= 1; // this will preload next post
		WPIV.setup();
		WPIV.setupEventHandlers();
		WPIV.show();
	},

	'setup': function(){
	 
		WPIV._trans = Math.round(10*WPIV.cfg.fadeDuration/1000)/10;

 
	
		//full screen underlay
		WPIV._elUnderlay = jQuery('<div></div>').attr('id','wpiv_underlay').prependTo('body');

	
		//image wrapper 
		WPIV._elImgWrp = jQuery('<div></div>')
			.attr('id','zoomcontainer')
			.css({"position":"relative",'overflow':'hidden'})
			.appendTo(WPIV._elUnderlay);
		
		
		//add two img elements to switch between, inside the image wrapper
		for (var i = 0; i < 2; i++) {
			jQuery('<img/>')
			.attr({id:'wpiv_img_'+i,alt:'Slide',	'src':WPIV.cfg.wpPluginUrl+'/assets/wpiv-theimage.gif',
			"width":1,"height":1})
			.css({'position':'absolute','opacity':'0'})
			.appendTo(WPIV._elImgWrp);
						
		}
		WPIV._elImgA = jQuery("#wpiv_img_0");
		WPIV._elImgB = jQuery("#wpiv_img_1");
	
		
		//an overlay to hold a busy-loading indicator if necessary
		WPIV._elZoomOvl = jQuery('<div></div>').attr('id','wpiv_ovl')
		.css({'width':'100%','height':'100%','text-align':'center'}) //initial size and position
		.appendTo(WPIV._elUnderlay);
		
		//long loading time message
		WPIV._elZoomOvlText = jQuery('<div>'+WPIV.cfg.slowMessage+'</div>').attr('id','wpiv_ovl_text')
		.appendTo(WPIV._elZoomOvl);	
		 
		
		//a hidden image element to store preloaded image
		WPIV._elPreload = jQuery('<img/>')
			.attr({alt:'Preload',	src:'',id:'wpiv_preload'})
			.css({"display":"none" })
			.appendTo(WPIV._elUnderlay);

		//menu and other items
		if(WPIV._createMenu) {
			WPIV._elcommands = jQuery('<div id="wpiv_menu"><ul><li id="wpiv_imginfo"  unselectable="on" ></li><li id="wpiv_view" class="wpiv_cmd"  unselectable="on" >style</li><li id="wpiv_play" class="wpiv_cmd" unselectable="on" >auto</li><li id="wpiv_exit" class="wpiv_cmd"  unselectable="on" >exit</li></ul></div>')
				.css({"width":"100%","min-width":"300px","overflow":"hidden",
				"height":WPIV.cfg.menuHeight,
				"position":"absolute","bottom":WPIV.cfg.menuHeight*-1,"left":"0px","cursor":"pointer","z-index":"1050"})
				.appendTo(WPIV._elUnderlay);
			WPIV._elMenu		= jQuery("#wpiv_menu");
			WPIV._elMenuCounter	= jQuery("#wpiv_imginfo");
			WPIV._elMenuView	= jQuery("#wpiv_view");
			WPIV._elMenuAuto	= jQuery("#wpiv_play");
			WPIV._elMenuExit	= jQuery("#wpiv_exit");
		

			jQuery("div#wpiv_menu ul li").css({"width":"25%","line-height":WPIV.cfg.menuHeight+"px"});

		 }
		//do not allow auto-advance when one post
		if(WPIV._numberOfSlides < 2) { 
			WPIV._elMenuAuto.removeClass("wpiv_cmd");
			WPIV._elMenuAuto.addClass("wpiv_cmd_inactive");		
		}		
		//next and prev button as defined in stylesheet	
		WPIV._elNext= jQuery('<div></div>').attr({id:"wpiv_next"}).hide().appendTo(WPIV._elUnderlay);
		WPIV._elPrev= jQuery('<div></div>').attr({id:"wpiv_prev"}).hide().appendTo(WPIV._elUnderlay);	 

		//auto-advance indicator as defined in stylesheet
		WPIV._elRunningIndicator=jQuery('<div></div>')
			.attr({id:'wpiv_running'})
			.appendTo(WPIV._elUnderlay);

		//set the background color of body
		jQuery('body').css({"background-color":WPIV._elUnderlay.css("background-color")});
		
		//get the height for positioning of next-arrow, assuming prev is same-same
		WPIV._arrowSize = WPIV._elNext.outerHeight();
		
		WPIV.switchview(WPIV._viewStyle);

		return;
	},
	'show'	: function() {
		if(WPIV._busyLoadingImg) return;
		
		WPIV._busyLoadingImg = 1;

		var $imgEl, $imgElCurrent, preload_slideNumber, preload_url, imgurl, longerThanExpectedTimer;
		var sno 	= WPIV.cfg.parr[WPIV._slideNumber];
		var postID	= seqArray[sno][0];
		var wn 		= seqArray[sno][1];
		var hn 		= seqArray[sno][2];
			
		//build src attribute for image
		imgurl 	= WPIV.cfg.wpUploadUrl+seqArray[sno][3];
	
		//rotate the stack
		WPIV._elImgWrp.find('img:last').prependTo(WPIV._elImgWrp);
		
		//the current image is now in the bottom of the stack - this will be faded out
	
		
		var progTimer = setTimeout(function () {showLoader()}, 300);
		
		WPIV._elImgWrp.find('img:first').attr({src:''}); //for Firefox, to trigger imagesloaded
		WPIV._elImgWrp.find('img:first')
			.attr({'src':imgurl,'width':wn,'height':hn})
			.data({"naturalwidth":wn,"naturalheight":hn,"seqno":WPIV._slideNumber});
		//the top img element in wrapper now waiting to be displayed
		
			
		//fit divs
		WPIV.fitimage();	

		var imgLoad = imagesLoaded( WPIV._elImgWrp.find('img:first') );

		imgLoad.on( 'done', function( instance ) {
			//hide any progress messages
			clearTimeout(longerThanExpectedTimer);
			clearTimeout(progTimer);

			WPIV._elZoomOvl.css("background-image","none");
			WPIV._elZoomOvlText.hide();
			

			WPIV._elImgWrp.find('img:first').css({'opacity':'1','display':'block','transition': 'opacity '+WPIV._trans+'s linear'});
			WPIV._elImgWrp.find('img:last').css({'opacity':'0','display':'block','transition': 'opacity '+WPIV._trans+'s linear'});


			//preload next or previous depending on last direction
			preload_slideNumber = (WPIV._lastNavigation > -1 ? WPIV.next() : WPIV.previous());
			
			//build src attribute for preload image
			preload_url = WPIV.cfg.wpUploadUrl+seqArray[WPIV.cfg.parr[preload_slideNumber]][3];
			WPIV._elPreload.attr({src: preload_url});
			
			WPIV._busyLoadingImg = 0;		
		});

		
		//position the navigation arrows
		WPIV.positionarrows();
		
		//update counter
		WPIV._elMenuCounter.html(WPIV._slideNumber+" / "+WPIV._numberOfSlides);

		function showLoader() {
			WPIV._elZoomOvl.css("background-image","url('"+WPIV.cfg.wpPluginUrl+"/assets/wpiv-loader.gif')");
			longerThanExpectedTimer = setTimeout(function () {showLongerThanExpected()}, WPIV.cfg.expectedLoadtime*1000);
		} 
		function showLongerThanExpected() {
			WPIV._elZoomOvlText.show();

		} 
		
	},
	'positionarrows'		: function(){
		var winH = jQuery(window).height();
		WPIV._elPrev.css({"top": (winH-WPIV.cfg.menuHeight)/2 - WPIV._arrowSize/2});
		WPIV._elNext.css({"top": (winH-WPIV.cfg.menuHeight)/2 - WPIV._arrowSize/2});
	},
	'setupEventHandlers'	: function(){

		//navigation
		WPIV._elUnderlay.on('click', function(event) {
		
			if(WPIV._busyLoadingImg) return;
			
			event.preventDefault();
			var scrollLeft	= jQuery(window).scrollLeft();
			var scrollTop	= jQuery(window).scrollTop();			
			var winW 		= jQuery(window).width();
			var winH 		= jQuery(window).height();
			var clickWidth	= 0;

			//if only one slide, only possible action is toggling menu - no next/prev 
			if(WPIV._numberOfSlides === 1) {
				WPIV.showmenu( ! WPIV._showMenu)
				return;
			}	
			
			//bottom of screen
			var clickHeightMax = winH+scrollTop;
			
			//bottom of next/previous click area
			var clickHeightMin = winH+scrollTop - WPIV.cfg.menuHeight;

			//width of next/previous click area, make a bit larger when width of window is small	
			if((winW-scrollLeft) < 300) {clickWidth = 0.3*winW;} else {clickWidth = 0.25*winW;}

			//previous if not busy loading
			if( event.pageX - scrollLeft < clickWidth && event.pageY < clickHeightMin) {
				WPIV._slideNumber = WPIV.previous();
				WPIV.show();
			}
			//next if not busy loading
			else if (event.pageX + scrollLeft > winW - clickWidth && event.pageY < clickHeightMin) {
				WPIV._slideNumber = WPIV.next();
				WPIV.show();
			}else {
				//toggle menu
				WPIV.showmenu( ! WPIV._showMenu)
			}
			return;
		});
		//switch style button (view)
		 WPIV._elMenuView.on('click', function(event) {
			event.stopPropagation();		 
			WPIV.switchview();
			WPIV.fitimage();
		});

		//exit button
		 WPIV._elMenuExit.on('click', function(event) {
			event.stopPropagation();
			WPIV.reset();
		
		});		
		//auto-advance button
		 WPIV._elMenuAuto.on('click', function(event) {
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

			var kc =  e.keyCode;
			// eXit
			if (kc === 88)
				WPIV.reset();
			// Auto
			if (kc === 65 && WPIV._numberOfSlides > 1)
				WPIV.startstop();			
			// Prev
			if ((kc === 80 || kc === 37) && !WPIV._busyLoadingImg && WPIV._numberOfSlides > 1) {
				WPIV._slideNumber = WPIV.previous();
				WPIV.show();
			}
			// Next
			if ((kc === 78 || kc === 39) && !WPIV._busyLoadingImg && WPIV._numberOfSlides > 1) {
				WPIV._slideNumber = WPIV.next();
				WPIV.show();
			}
			// Last
			if (kc === 76 && !WPIV._busyLoadingImg) {
				WPIV._slideNumber = WPIV._numberOfSlides;
				WPIV.show();
			}				
			// Down arrow - hide menu
			if (kc === 40) {
				if (WPIV._showMenu)
					WPIV.showmenu(false);
			}
			// Up arrow - show menu
			if (kc === 38) {
				if ( ! WPIV._showMenu)
					WPIV.showmenu(true);
			}				
			
			// Y, V switch style (view)
			if((kc === 89 || kc === 86)) { 
				WPIV.switchview();
				WPIV.fitimage();
			}
	
		})); //end of shortcut keys

		//resize window event
		jQuery( window ).on('resize', (function(e) {
			WPIV.windowresize()
		})); 
	
	},

	'showmenu'	: function(showit) {
		
		if(showit) {

			WPIV._showMenu = true;
			
			//fit image if menu not set to overlay
			if( ! WPIV.cfg.menuOverlay)
				WPIV.fitimage(1); //1 = smooth
			
			WPIV._elMenu.show();
			WPIV._elMenu.animate({
				bottom: "+="+WPIV.cfg.menuHeight,
			}, 300, function() {WPIV.showarrows(true);});					
			
		}
		else {
			WPIV._showMenu = false;
			
			//fit image if menu not set to overlay
			if( ! WPIV.cfg.menuOverlay)
				WPIV.fitimage(1); //1 = smooth
			
			WPIV.showarrows(false);
			WPIV._elMenu.animate({
				bottom: "-="+WPIV.cfg.menuHeight,
			}, 300, function() {WPIV._elMenu.hide();});
								
		}

		return;
	},
	'showarrows' : function (showit) {
	
		//no navigation if only one image in array
		if(WPIV._numberOfSlides < 2) return;
		
		if(showit) {
				WPIV._elNext.show();
				WPIV._elPrev.show();				
			}else {
				WPIV._elNext.hide();
				WPIV._elPrev.hide();					
		}
	
	},
 	'startstop'	: function() {
		if( ! WPIV._busyLoadingImg || WPIV._autoDo) { //if busy, it can only be stopped
			if( ! WPIV._autoDo) {
					WPIV._autoDo = true;
					WPIV._elMenuAuto.text("stop");
					WPIV._elMenuAuto.addClass("wpiv_auto_running");
					WPIV._elRunningIndicator.show();
					if (WPIV._showMenu) WPIV.showmenu(false);
					autoNext();
				} else {
					WPIV._elRunningIndicator.hide();			
					WPIV._elMenuAuto.text("auto");
					WPIV._elMenuAuto.removeClass("wpiv_auto_running");

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
						 if( ! WPIV._busyLoadingImg) {
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
		if( ! WPIV._busyLoadingImg) {
			if(typeof viewno === 'undefined') {
				if(WPIV._viewStyle === 3) { //remove old img classes
					WPIV._elImgA.removeClass('wpiv_view_border');
					WPIV._elImgB.removeClass('wpiv_view_border');		
				}
				if(WPIV._viewStyle < 4) WPIV._viewStyle++; else WPIV._viewStyle = 1;

			} else WPIV._viewStyle = viewno;
			
			WPIV._elImgWrp.removeClass();
		
			switch(WPIV._viewStyle) {
				case 1: WPIV._elImgWrp.addClass('wpiv_view_square_one');break;
				case 2: WPIV._elImgWrp.addClass('wpiv_view_square_two');break;
				case 3: WPIV._elImgB.addClass('wpiv_view_border');
						WPIV._elImgA.addClass('wpiv_view_border');
						break;
				case 4: //no partucluar setting at the moment
						break;			
			}
		
		}			
	},	
	'fitimage' : function(animateResize) {

		var scrollTop 	= jQuery(window).scrollTop();
		var winW 		= jQuery(window).width();
		var winH 		= jQuery(window).height();
		
		if( ! WPIV.cfg.menuOverlay && WPIV._showMenu) {
		
			winH = winH-WPIV.cfg.menuHeight;
		}	

		var hScale, wScale, pScale, fitH, fitW, marginL, marginT, wrapH, wrapW, wrapMarginL, wrapMarginT;
		
		if(typeof animateResize === 'undefined') animateResize = 0;
		
		
		$ovl = WPIV._elZoomOvl;
		$wrp = WPIV._elImgWrp;
		$img = WPIV._elImgWrp.find('img:first');

		var w = $img.data("naturalwidth");
		var h = $img.data("naturalheight");

		
		if(WPIV._viewStyle === 1 || WPIV._viewStyle === 2)
		{
			//view type 1 and 2, square
			var winSquare=Math.min(winW-40, winH-40);
			hScale = (winSquare)/h;
			wScale = (winSquare)/w;
			pScale = Math.min(hScale, wScale);

			fitW = Math.round(w*pScale);
			fitH = Math.round(h*pScale);
			
			marginL = Math.round((winSquare-fitW)/2);
			marginT = Math.round((winSquare-fitH)/2);
			
			wrapMarginL = Math.round((winW-winSquare)/2);
			wrapMarginT = Math.round((winH-winSquare)/2) + scrollTop;
			
			wrapH = winSquare;
			wrapW = winSquare;

			//adjust wrapper, smooth change if resize due to menu on/off
			if(animateResize) { 
				$wrp.animate({"top":wrapMarginT,"left":wrapMarginL,"width":wrapW,"height":wrapH}, 300, function() {});
			}else {
				$wrp.css({"top":wrapMarginT,"left":wrapMarginL,"width":wrapW,"height":wrapH});
			}

			$ovl.css({"top":wrapMarginT+marginT,"left":wrapMarginL+marginL,"width":fitW,"height":fitH});
		}
		
		else if (WPIV._viewStyle === 3)
		{
			// view type 3, image with border
			var w = $img.data("naturalwidth");
			var h = $img.data("naturalheight");
	
			border = Math.round(($img.outerWidth()-$img.innerWidth())/2);

	
			hScale = (winH-40-(2*border))/(h+2*border);
			wScale = (winW-60-(2*border))/(w+2*border);
				
			pScale = Math.min(hScale, wScale);

			fitW = Math.round((w+2*border)*pScale);
			fitH = Math.round((h+2*border)*pScale);
			
			marginL = Math.round((winW-fitW)/2)-border;
			marginT = Math.round((winH-fitH)/2)-border;
			
			$wrp.css({"top":0+scrollTop,"left":0,"width":"100%","height":"100%"});
			$ovl.css({"top":marginT,"left":marginL,"width":fitW,"height":fitH});
			
		}		
	
		else 
		{
			// view type 4, full throttle!
			hScale = (winH)/h;
			wScale = (winW)/w;

			pScale = Math.min(hScale, wScale);

			fitW = Math.round(w*pScale);
			fitH = Math.round(h*pScale);

			marginL = Math.round((winW-fitW)/2);
			marginT = Math.round((winH-fitH)/2);
			

			$wrp.css({"top":0+scrollTop,"left":0,"width":"100%","height":"100%"});
			$ovl.css({"top":marginT,"left":marginL,"width":fitW,"height":fitH});
			
		}		
		
		//adjust image, smooth change if resize due to menu on/off

		if(animateResize) { 
			$img.animate({"top":marginT,"left":marginL,"width":fitW,"height":fitH}, 300, function() {
			});
		}
		else {
			$img.css({"top":marginT,"left":marginL,"width":fitW,"height":fitH});
		}


		

	},
	'reset' : function() {

		if(WPIV._autoTimer) clearTimeout(WPIV._autoTimer);
		
		//removes everything that was created, including bound events
		WPIV._elUnderlay.remove(); 
		
		//if single post page go to the single post page for current image
		if(WPIV._pageType === "single" && WPIV._slideNumber !== WPIV._initialSlide)
		{
			var siteurl = window.location.protocol + "//" + window.location.host;
			window.location.href = siteurl+"?p="+seqArray[WPIV._slideNumber][0];
		}else{

			jQuery('body').css({"background-color":WPIV._initialBGColor});		
			jQuery("body").children().fadeTo('fast',1);
			jQuery('html').css({"height":WPIV._initialHtmlH});
			jQuery('body').css({"height":WPIV._initialBodyH});			
			jQuery('html, body').css({"overflow":"visible"});			
			jQuery("html, body").scrollTop(WPIV._lastScrollPos);
			
		}
	}
} // end of object

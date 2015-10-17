/**
 * Plugin Name: Image Projector
 * Plugin URI: http://www.lystfotograf.net/imageprojector
 * Description: A swift viewer and slideshow for the first image in published posts. 
 * Version: 1.5
 * Author: Christian G
 * Author URI: http://www.lystfotograf.net
 * License: GPL2
*/

;jQuery(document).ready(function( $ ) {

	if ( ! ( 'undefined' === typeof WPIVConfig ) )
	{
		WPIV.settings(WPIVConfig);	

		jQuery(WPIVConfig.cfg.bindto).bind('click', function( event ){
		
			jQuery(this).parent().blur();

			return(! WPIV.start(jQuery(this)));
			
		});
	}
});	
"use strict";
var WPIV = WPIV || {} 
WPIV = {

	DND				: 0, // DoNotDisturb
	active			: false,


	captionON		: true,
	menuON			: 0,
	
	numSlides		: 0,
	initSlide		: 0,	
	slideNum		: 0,
	
	foundMenu		: 0,
	lastScrollPos	: 0,
	lastNavigation 	: 0,
	viewStyle		: 3,
	bckStyle		: 2,
	autoTimer		: null,
	autoDo			: false,

	initialBodyH	: '',
	initialHtmlH	: '',
	captions		: Array(),
	gallery			: Array(),

	slowTimer		: 0,
	progTimer		: 0,
	menuHeight		: 0,
	
	// DOM element cache 'el'
	el				: Array(),
	imageDeck		: Array(),

	threeD			: false,
	transitionEnd	: '',
	
		
	transitionStyle	: 0,
	context			: 0,
	
	TRANS_CROSSFADE	: 1,
	TRANS_FADESLIDE	: 2,
	TRANS_SLIDESLIDE: 3,
	CONTEXT_SINGLE	: 1,
	CONTEXT_ARCHIVE	: 2,
	CONTEXT_GALLERY	: 3,
	CONTEXT_UNDEF	: 0,	
	
    'cfg' : {
		'transitionStyle'	: WPIV.TRANS_FADESLIDE,
		'bindto'			: '',
		'menuOverlay'		: true,
		'menuHeight'		: 50,
		'autoDuration'		: 3,  // secs	
		'expectedLoadtime'	: 6,  // secs	
		'slowMessage'		: 'Slow network or large image file? You may wait to see if the image appears or refresh page...',
		'fadeDuration'		: 500, // milliseconds
		'doNotScaleUp'		: false,
		'captions'			: false,
		'showArrows'		: true,
		'galleryWrappers'	: '.gallery, .envira-gallery-wrap, .ngg-galleryoverview'
		},
	'wpdata' : {
		'postString'		: '',
		'wpUploadUrl'		: '',
		'wpPluginUrl'		: '',
		'version'			: '',
		'wpGallery'			: Array(),
		'archive'			: Array()
	
	},
	'settings' : function(phpcfg){
	
			if (phpcfg && typeof(phpcfg) === 'object') {
				jQuery.extend(WPIV.cfg, phpcfg.cfg);
				jQuery.extend(WPIV.wpdata, phpcfg.wpdata);
			}

	},	
	'start' :function(initImage){
		
		if (typeof wpiv_postarray === 'undefined') {
			return (false);
		}

		var winW 		= jQuery(window).width();
		var winH 		= jQuery(window).height();
		var retVal		= false;
		
		WPIV.gallery = [];
		// default view style on small screens
		if ((winH <801 && winW  <601) || (winH  <601 && winW  <801)) WPIV.viewStyle = 4;
		
		
		// find and set up the CONTEXT (single, archive, gallery)
		if (WPIV.getgallery(initImage)) {
			WPIV.context = WPIV.CONTEXT_GALLERY;
		}else if(WPIV.wpdata.postString) {
			WPIV.context = WPIV.CONTEXT_ARCHIVE;
			var arr=[];
			arr.push.apply(arr, WPIV.wpdata.postString.split(",").map(Number));
			//filter out any archive items not connected to a particular image
			for (var i = 1; i < arr.length; i++) {
				for (var j = 1; j < wpiv_postarray.length; j++) {
					if (arr[i] === WPIV.getpostid(j))
					{
						WPIV.wpdata.archive[i] = j; // set global sequence no
						
					}
				}
			}
		}else {
			WPIV.context = WPIV.CONTEXT_SINGLE;
		}
		
		// set number of slides
		switch(WPIV.context) {
			case WPIV.CONTEXT_SINGLE:
					WPIV.numSlides =  wpiv_postarray.length - 1;
				break;
			case WPIV.CONTEXT_ARCHIVE:
					WPIV.numSlides =  WPIV.wpdata.archive.length - 1;
				break;
			case WPIV.CONTEXT_GALLERY:
					WPIV.numSlides =  WPIV.gallery.length - 1;
					
				break;				
				
		}		
		
		if(WPIV.context ===  WPIV.CONTEXT_ARCHIVE || WPIV.context ===  WPIV.CONTEXT_SINGLE){
			// archive and single context uses global array of posts to map image
			// find which post the clicked image belongs to		
			if( ! WPIV.connectpost(initImage)) {
					WPIV.context = WPIV.CONTEXT_UNDEF;
				}
		}

		if(WPIV.context !== WPIV.CONTEXT_UNDEF) {

			WPIV.initSlide 			= WPIV.slideNum;
			WPIV.lastNavigation		= 1; // this will preload next post
			WPIV.transDuration		= Math.round(10*parseInt(WPIV.cfg.fadeDuration)/1000)/10;
			WPIV.transitionStyle	= WPIV.cfg.transitionStyle;
			WPIV.menuHeight			= parseInt(WPIV.cfg.menuHeight);
			WPIV.getfromcookie();
			WPIV.setup();
			WPIV.setupEventHandlers();
			WPIV.show(true);
			
			if(WPIV.cfg.captions) {
				if(WPIV.context ===  WPIV.CONTEXT_ARCHIVE || WPIV.context ===  WPIV.CONTEXT_SINGLE) {
					WPIV.loadcaptions();
				}else {
					WPIV.setcaption(WPIV.slideNum);
				}
				if( ! WPIV.captionON) {
					if( ! WPIV.foundMenu) WPIV.showmenu(true);
				}
			}
			if(WPIV.hasTranslate3D()){
				WPIV.threeD = true;
			}
			
			WPIV.transitionEnd = WPIV.hasTransitionEnd();
				
			retVal = true;
			
		}
		
		return retVal;	
	
	 
	},
	'getgallery' : function(initImage) {
		
		var foundGallery 	= false;
		var galleryItem 	= [];
		var clicked			= '';
		var retVal 			= false;
		var j				= 0;
		var img				= '';
		var galleryWrappers = [];
		
		galleryWrappers = WPIV.cfg.galleryWrappers.split(',');
		
		for (var i = 0, l = galleryWrappers.length; i < l; ++i) {
			foundGallery = jQuery(initImage).closest("div"+galleryWrappers[i]);
				if(foundGallery.length > 0) {
					WPIV.gallery.push(galleryItem); //add one blank item to use 1-base reference
					
					clicked = jQuery(initImage).attr('href');

					foundGallery.find('a').each(function(){
						j++;
						img =  jQuery('img', jQuery(this));
						galleryItem = [];				
						galleryItem['src']	= jQuery(this).attr('href');
						galleryItem['alt']	= img.attr('alt');
						galleryItem['w'] 	= 0;
						galleryItem['h'] 	= 0;
						if(img.attr('src') === initImage.attr('src')) {
							WPIV.slideNum = j;
						}
						WPIV.gallery.push(galleryItem);

						retVal = true;	
					});
					break;
				}
		
		}
		return (retVal);
	},
	'connectpost' : function (img) {

		var totalPosts 		= wpiv_postarray.length;
		var in_Image 		= img.attr("src");		
		var in_GlobalSeqno	= null;

		var in_PostID = null;
		
		in_PostID = img.data("postid");
		in_GlobalSeqno = img.data("seqno");

		if (in_Image.length > 0) {
				
				
				if(in_PostID) {
							for (var i = 1; i < totalPosts; i++) {
									if (in_PostID === WPIV.getpostid(i) && in_Image.lastIndexOf(WPIV.getsrc(i)) !== -1) {
									in_GlobalSeqno = i;
									break;
								}
							}							
					}else {
							for (var i = 1; i < totalPosts; i++) {
									if (in_Image.lastIndexOf(WPIV.getsrc(i)) !== -1) {
									in_GlobalSeqno = i;
									break;
								}						
							}
					
						}
				
			}
		else {
			return (false); 
		}

		if(in_GlobalSeqno) 
		{
			if(WPIV.numSlides === 1) {
				
				WPIV.wpdata.archive[1] 	= in_GlobalSeqno;
				WPIV.slideNum 			= 1;
			} else if(WPIV.context === WPIV.CONTEXT_ARCHIVE )
			{
				for (var i = 1; i < WPIV.wpdata.archive.length; i++) {

					if (WPIV.wpdata.archive[i] === in_GlobalSeqno)
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
		var src = '';
		if(WPIV.context === WPIV.CONTEXT_GALLERY)
		{
			src = WPIV.gallery[sno]['src'];
		} else
		{
			src = wpiv_postarray[sno][3];
		}
		return (src);
	},
	'getcaption' : function(sno) {
		var caption = '';
		if(WPIV.context === WPIV.CONTEXT_GALLERY)
		{
			caption = WPIV.gallery[sno]['alt'];
		} else
		{
			caption = (WPIV.captions[WPIV.getpostid(sno)]);
		}
		return (caption);
	},
	'setcaption' : function(sno) {
		WPIV.el.captionRight.html(WPIV.slideNum+"/"+WPIV.numSlides);
		WPIV.el.captionText.html(WPIV.getcaption(sno));
		if(WPIV.context !== WPIV.CONTEXT_GALLERY) {
		
			WPIV.el.captionPostID.html('# '+ WPIV.getpostid(sno));
		}
	},
	'loadcaptions' : function() {

		var jfile = WPIV.wpdata.wpPluginUrl+'/ref/wpiv_ref_c_'+WPIV.wpdata.version+'.json';
		var sno, caption, href, postID;
		jQuery.getJSON( jfile, function( data ) {
			jQuery.each( data, function( key, val ) { 
				WPIV.captions[key]=val;
			});
			sno 	= ( WPIV.context === WPIV.CONTEXT_ARCHIVE) ? WPIV.wpdata.archive[WPIV.slideNum] : WPIV.slideNum;

			WPIV.setcaption(sno);

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
		jQuery('body').css({"height":"100%","width":"100%"});

		jQuery('html, body').css({"overflow":"hidden"});
		
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
			.attr({id:'wpiv_img_'+i,'src':WPIV.wpdata.wpPluginUrl+'/img/wpiv-theimage.gif',
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


		var menuWrapper = WPIV.el.underlay;

		
		// menu and other items
		var menuItemClass	= "class='wpiv_cmd' unselectable='on'";
		var menuIconFont	= "class='material-icons md-sz mi-align icon-color'";

		var mi = 0;
		var ms = '';
		var menuItems = [];
		
		if(WPIV.cfg.captions) {
			menuItems[mi++] = ["wpiv_caption_switch", "&#xE048"];
		}
		
		menuItems[mi++] = ["wpiv_bck", "&#xE3AB"];
		menuItems[mi++] = ["wpiv_view","&#xE3C2"];
		menuItems[mi++] = ["wpiv_play","&#xE037"];
		menuItems[mi++] = ["wpiv_exit","&#xE5CD"];
		
		
		for (var i = 0, l = menuItems.length; i < l; ++i) {
			ms = ms + '<li id="' + menuItems[i][0] + '" '+menuItemClass + '><i ' + menuIconFont + '>'+menuItems[i][1] + ';</i></li>';
		}

		jQuery('<div id="wpiv_menu" class="menu"><ul>'+ms+'</ul></div>')
			.css({"width":"100%","min-width":"300px","overflow":"hidden",
			"height":WPIV.menuHeight,
			"position":"absolute","bottom":WPIV.menuHeight*-1,"left":"0px","cursor":"pointer","z-index":"1050"})
			.appendTo(menuWrapper);		

		if( ! WPIV.cfg.captions) {
		
			jQuery('<li id="wpiv_imginfo"  unselectable="on" ></li>')
				.prependTo('#wpiv_menu>ul');
			// cache 	
			WPIV.el.counter			= jQuery("#wpiv_imginfo");
		}		
		
		// cache 
		WPIV.el.menu			= jQuery("#wpiv_menu");
		WPIV.el.bckswitch   	= jQuery("#wpiv_bck");
		WPIV.el.style			= jQuery("#wpiv_view");
		WPIV.el.auto			= jQuery("#wpiv_play");
		WPIV.el.exit			= jQuery("#wpiv_exit");
		
		WPIV.el.style.icon		= jQuery("#wpiv_view>i");	
		WPIV.el.auto.icon		= jQuery("#wpiv_play>i");
		
		jQuery("div#wpiv_menu ul li").css({"width":"20%","line-height":WPIV.menuHeight+"px"});

		
		// caption support, if set in plugins admin menu
		if(WPIV.cfg.captions) {
			// cache 
			WPIV.el.captionswitch 	= jQuery("#wpiv_caption_switch");
			
			jQuery('<div id="wpiv_caption" unselectable="on"></div>')
				.css({"width":"100%","overflow":"hidden","text-overflow":"ellipsis","white-space":"nowrap","height":WPIV.menuHeight,"z-index":"1040",
				"position":"absolute","bottom":WPIV.captionON === false?WPIV.menuHeight*-1:0,"line-height":WPIV.menuHeight+"px"})
				.appendTo(menuWrapper);
			
			// cache 
			WPIV.el.caption = jQuery("#wpiv_caption");

			jQuery('<div id="wpiv_caption_postid" class="wpiv_caption_data" unselectable="on"></div>')
				.css({"float":"left","width":WPIV.menuHeight+70+"px"})
				.appendTo(WPIV.el.caption);


			jQuery('<div id="wpiv_caption_exit" class="wpiv_caption_data wpiv_cmd" unselectable="on"><i class="material-icons md-sz-small mi-align">&#xE5CD;</i></div>')
				.css({"float":"right","width":WPIV.menuHeight+"px"})
				.appendTo(WPIV.el.caption);
				
			jQuery('<div id="wpiv_caption_rightbox" class="wpiv_caption_data" unselectable="on"></div>')
				.css({"float":"right"})
				.appendTo(WPIV.el.caption);

				
			jQuery('<div id="wpiv_caption_text" unselectable="on"></div>')
				.css({"height":"100%","padding-left":"15px","padding-right":"15px","overflow":"hidden","text-overflow":"ellipsis","white-space":"nowrap"})
				.appendTo(WPIV.el.caption);
			
			// cache 
			WPIV.el.captionText 	= jQuery("#wpiv_caption_text");
			WPIV.el.captionPostID 	= jQuery("#wpiv_caption_postid");
			WPIV.el.captionRight 	= jQuery("#wpiv_caption_rightbox");	
			WPIV.el.captionExit		= jQuery("#wpiv_caption_exit");
			if(WPIV.captionON) {WPIV.el.caption.show();}else {WPIV.el.caption.hide();}
		}
		
		
		 
		// do not allow auto-advance when one post, neutralize the button
		if(WPIV.numSlides < 2) { 
			WPIV.el.auto.removeClass("wpiv_cmd");
			WPIV.el.auto.addClass("wpiv_cmd_inactive");		
		}		
		// next and prev button as defined in stylesheet	
		WPIV.el.next = jQuery('<div id="wpiv_next" class="arrow_next"></div>').hide().appendTo(WPIV.el.underlay);
		WPIV.el.prev = jQuery('<div id="wpiv_prev" class="arrow_prev"></div>').hide().appendTo(WPIV.el.underlay);
	
		// auto-advance indicator as defined in stylesheet
		WPIV.el.running = jQuery('<div title="Running slides"></div>')
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
	'getnext'	: function() {
		// returns next slide number		
		WPIV.lastNavigation = 1;

		return((WPIV.slideNum + 1 > WPIV.numSlides) ? 1 : WPIV.slideNum + 1);
	},
	'getprev'	: function() {
		// returns previous slide number
		WPIV.lastNavigation = -1;
		return((WPIV.slideNum - 1 < 1) ? WPIV.numSlides : WPIV.slideNum - 1);			
	},
	'navigate': function(direction) {
		if( WPIV.BUSY()) {return;}
		WPIV.slideNum = (direction > 0) ? WPIV.getnext(): WPIV.getprev();
		WPIV.show();
	},
	'getspecifiedsize': function(sno) {
		var sz = [];
		if(WPIV.context === WPIV.CONTEXT_GALLERY) {
			sz['wn'] 	= WPIV.gallery[sno]['w'];
			sz['hn'] 	= WPIV.gallery[sno]['h'];
		}else {
			sz['wn'] 	= wpiv_postarray[sno][1];
			sz['hn'] 	= wpiv_postarray[sno][2];
		}
		return(sz);
	},
	'show'	: function(isinit) {
		if(WPIV.DND) return;
		
		WPIV.BUSY(true);

		if(isinit != true)	{
			isinit = false;
		}		
		var useCrossFade = false;
		
		var evList 		= 'webkitTransitionEnd otransitionend oTransitionEnd msTransitionEnd transitionend';
		var slideDuration, optrans, slidetrans, postID, src, imgNext, imgCurr, imgURL, sno, sz, wn, hn, nextFinish, currFinish;
					
		sno 			=  (WPIV.context === WPIV.CONTEXT_ARCHIVE) ? WPIV.wpdata.archive[WPIV.slideNum] : WPIV.slideNum;		
		slideDuration 	= 0.4;
		optrans 		= 'opacity '+WPIV.transDuration+'s linear';
		slidetrans 		= 'left ' + slideDuration + 's linear';
		postID			= WPIV.getpostid(sno);		
		src				= WPIV.getsrc(sno);
		sz				= WPIV.getspecifiedsize(sno);
		wn				= sz['wn'];
		hn				= sz['hn'];
		WPIV.progTimer 	= setTimeout(function () {WPIV.showloader()}, 300);

		// build src attribute for image
		if(src.indexOf("http") < 0 && src.indexOf("https") < 0)
		{	// file on your domain, path relative to wp upload dir
			imgURL 	= WPIV.wpdata.wpUploadUrl + src;
		}else {
			imgURL 	= src;
		}
		
		imgCurr = WPIV.imageDeck[0];
		// rotate array
		WPIV.imageDeck.unshift(WPIV.imageDeck.pop());
		imgNext = WPIV.imageDeck[0];
		
		// for Firefox, set src to blank first to trigger imagesloaded
		imgNext.attr({src:''});
		imgNext.attr({'src':imgURL}).data({"seqno":WPIV.slideNum});
		if(wn > 0 && hn > 0) {
			imgNext.attr({'width':wn,'height':hn});
			WPIV.fitimage(0, imgNext);
		}
									

		imgCurr.css({'z-index':'1005','transition':'none','transform':'none'});
		
		var imgLoad = imagesLoaded( imgNext); 


		imgLoad.on( 'done', function( instance ) {
		if(!isinit && WPIV.cfg.captions) {
			WPIV.el.captionText.fadeTo('fast',0.0);
		}
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

			
			// set up transition end event listeners		
			if(!isinit && WPIV.transitionEnd != '') {
				
				//when old is out
				imgCurr.one(WPIV.transitionEnd, function(event) {
					imgCurr.css({'left':wrapW,'opacity':'0','transition':'none','transform':'none'});
					currFinish = true;
					if(nextFinish) {
					 	WPIV.BUSY(false);
					} 
				});
				//when new is in
				imgNext.one(WPIV.transitionEnd, function(event) {
					imgNext.css({'transition':'none','transform':'none','left':wrapW-nextDelta});
					
					nextFinish = true;
					 if(currFinish) {
						WPIV.BUSY(false);
					 }
					if(WPIV.cfg.captions) {
						WPIV.setcaption(sno);
						WPIV.el.captionText.fadeTo('fast',1.0);
					}else {
						WPIV.el.counter.html(WPIV.slideNum+" / "+WPIV.numSlides);
					}
				});		
			}
			
			
			if(WPIV.transitionStyle === WPIV.TRANS_CROSSFADE || isinit) {
				imgNext.css({'opacity':'1','transition': optrans});
				imgCurr.css({'opacity':'0','transition': optrans});
				
				if(isinit) 	WPIV.BUSY(false);

		
			} else {
				var wrapW 		= WPIV.el.wrapper.outerWidth();
				var nextW 		= imgNext.outerWidth();
				var currW 		= imgCurr.outerWidth();
				var nextDelta 	= Math.round((wrapW + nextW)/2);
				var currDelta 	= Math.round((wrapW + currW)/2);
				var shiftNextX 	= (WPIV.lastNavigation > -1 ) ? -1 * nextDelta : nextDelta;
				var shiftCurrX 	= (WPIV.lastNavigation > -1 ) ? -1 * currDelta : currDelta;
				
				// to get same speed for incoming and outgoing image
				var durationOut = slideDuration + slideDuration * ((shiftCurrX - shiftNextX) / shiftNextX);
				
				// set start position for slide transition of next image
				var l = (WPIV.lastNavigation > -1 ) ? wrapW : -1 * nextW;
		
				// translateX or translate3D
				if(WPIV.threeD) {
					transIn 	= 'translate3D('+shiftNextX + 'px,0px,0px)';
					transOut 	= 'translate3D('+shiftCurrX + 'px,0px,0px)';
				} else {
					transIn 	= 'translateX('+shiftNextX + 'px)';
					transOut 	= 'translateX('+shiftCurrX + 'px)';
				}
				
				imgNext.css({'z-index':'1010','opacity':'1','left':l,
				'transition':'transform ' + slideDuration + 's  ease ','transform':transIn});
				
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
		
		WPIV.el.overlay.css("background-image","url('"+WPIV.wpdata.wpPluginUrl+"/img/wpiv-loader.gif')");
		WPIV.slowTimer = setTimeout(function () {showSlow()}, parseInt(WPIV.cfg.expectedLoadtime)*1000);
		
		function showSlow() {
			WPIV.el.slowText.show();
		}
	},
	'preload':function() {
		if(WPIV.numSlides < 2)
			return false;
			
		var src, preloadSlide, preloadSno, preloadUrl;
		
		preloadSlide 	= WPIV.lastNavigation > -1 ? WPIV.getnext() : WPIV.getprev();
		preloadSno		= (WPIV.context === WPIV.CONTEXT_ARCHIVE) ? WPIV.wpdata.archive[preloadSlide] : preloadSlide;
		src				= WPIV.getsrc(preloadSno);
		// build src attribute for image
		if(src.indexOf("http") < 0 && src.indexOf("https") < 0)
		{	// file on your domain, path relative to wp upload dir
			imgURL 	= WPIV.wpdata.wpUploadUrl + src;
		}else {
			imgURL 	= src;
		}
		
		preloadUrl 	= imgURL;
		
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
			var clickHMin = clickHMax;
			if(WPIV.menuON || WPIV.captionON) {
				clickHMin = clickHMax - WPIV.menuHeight;
			}

			// width of next/previous click area, a bit larger when width of window is small	
			if((winW-scrollLeft) < 320) {clickWidth = 0.3*winW;} else {clickWidth = 0.2*winW;}


			// previous
			if( clickX - scrollLeft < clickWidth && clickY < clickHMin) {
				WPIV.navigate(-1);
			}
			// next
			else if (clickX + scrollLeft > winW - clickWidth && clickY < clickHMin) {
				WPIV.navigate(1);
			}else if (clickY < clickHMin){
				// toggle menu
				WPIV.showmenu( ! WPIV.menuON);
				WPIV.foundMenu = true;
			}
			return;
		});
		// switch style button (view)
		 WPIV.el.style.on('click', function(event) {
			event.stopPropagation();		 
			if(WPIV.switchview()) {
				WPIV.fitimage();
				WPIV.savetocookie();
			}
		});
		// exit buttons
		var exits = WPIV.el.exit;
		if(WPIV.cfg.captions) {
			exits = WPIV.el.exit.add(WPIV.el.captionExit);
		}
		
		jQuery(exits).bind('click', (function(event) {
			event.stopPropagation();
			mc.off("panstart");
			mc.off("tap");
			WPIV.reset();
		
		}));

		// caption button
		if(WPIV.cfg.captions)  {
			 WPIV.el.captionswitch.on('click', function(event) {
				event.stopPropagation();
				WPIV.showcaptions( ! WPIV.captionON);
				WPIV.showmenu( ! WPIV.menuON);
			
			});
			// exit to post
			 WPIV.el.captionPostID.on('click', function(event) {
				event.stopPropagation();
				
				if((WPIV.context === WPIV.CONTEXT_SINGLE && (WPIV.slideNum !== WPIV.initSlide)) ||
					WPIV.context === WPIV.CONTEXT_ARCHIVE) {
					WPIV.gotopost();
				}else {
					WPIV.reset();
				}
			});
		}
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
					if(WPIV.switchview()) {
						WPIV.fitimage();
						WPIV.savetocookie();
					}					
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
					WPIV.el.auto.icon.html('&#xE034;');

					WPIV.el.running.show();
				
					if (WPIV.menuON) WPIV.showmenu(false);
					autoNext();
				} else {
					WPIV.el.running.hide();			

					WPIV.el.auto.removeClass(cname);
					WPIV.el.auto.icon.html('&#xE037;');

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
	
	'switchview': function(viewno) {
		if(WPIV.BUSY()) return false;

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
				case 1: wrp.addClass('wpiv_view_square_one');
						WPIV.el.style.icon.html('&#xE3D0;');
						break;
				case 2: wrp.addClass('wpiv_view_square_two');
						WPIV.el.style.icon.html('&#xE3D1;');
						break;
				case 3: for(var i = 0;i < WPIV.imageDeck.length; i++) WPIV.imageDeck[i].addClass(b);
						WPIV.el.style.icon.html('&#xE3D2;');
						break;
				case 4: WPIV.el.style.icon.html('&#xE3D4;');
						break;			
			}
		return true;
	},	
	'windowresize' : function() {
		if(WPIV.BUSY()) {
			WPIV.pendingResize = true;
			return;
		}

		WPIV.fitimage();
		WPIV.positionarrows();

	},


	'fitimage' : function(anim, $img) {

		var scrollTop 	= WPIV.lastScrollPos;
		var winMarginH	= 40;
		var winMarginW	= 60;
		var mh 			= parseInt(WPIV.menuHeight);
		
		winW = WPIV.el.underlay.width();
		winH = WPIV.el.underlay.height();

		
		if( (! WPIV.cfg.menuOverlay && WPIV.menuON) || WPIV.captionON) {
			winH = winH - mh;
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
			wrapMarginT = Math.round((winH-winSquare)/2);
			
			
			
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
			marginT = Math.round((winH-fitH)/2)- b;

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
			marginT = Math.round((winH-fitH)/2);

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
	'destroy': function() {
		
		if(WPIV.autoTimer) clearTimeout(WPIV.autoTimer);
		
		WPIV.savetocookie();
		jQuery(document).off('keyup');
		jQuery(document).off('kedown');	
		
		// remove everything that was created, including events bound to the elements
		WPIV.el.underlay.remove(); 
	},
	'gotopost': function() {

		var sno		= ( WPIV.context === WPIV.CONTEXT_ARCHIVE) ? WPIV.wpdata.archive[WPIV.slideNum] : WPIV.slideNum;
		var postid	= WPIV.getpostid(sno);
		
		WPIV.destroy();

		window.location.href = window.location.protocol + "//" + window.location.host + "?p=" + postid;

	},
	'reset' : function() {

		WPIV.destroy();

		jQuery('html').css({"height":WPIV.initialHtmlH});
		jQuery('body').css({"height":WPIV.initialBodyH});			
		jQuery('html, body').css({"overflow":"visible"});			
		jQuery("html, body").scrollTop(WPIV.lastScrollPos);

	},
	'hasTranslate3D':	function() {
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

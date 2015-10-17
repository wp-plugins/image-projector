=== Image Projector ===
Contributors: wpgloe
Tags: photography, photographer, image, viewer, lightbox, gallery, slideshow, responsive, dynamic, overlay, photo, prettyphoto,  simple, post, on-demand
Tested up to: 4.3.1
Requires at least: 4.0
Stable tag: 1.6
License: GPLv2 or later
License URI: http://www.gnu.org/licenses/gpl-2.0.html

Less is more. A swift and responsive image viewer and slideshow. 


== Description ==
This plugin provides a **responsive** full-window viewer and slideshow for images attached to posts or pages. **No editing of code required**.



In short:  
*No setup of galleries required  
*Responsive  
*Simple  
*Visitor can switch between styles run-time  
*Post title as caption  
*Modify colors, borders and fonts as you like  
*Uses on-demand image loading and preloading - fast startup  
*Hardware-accellerated image transitions  
*ACTIVE SUPPORT and available for enhancement and modification requests  

When activated from a **single-post page**, it allows you to navigate through the images in all published posts. **[DEMO HERE](http://www.lystfotograf.net/archives/2446 "A single post page on lystfotograf.net")**. Click an image.

When activated from an **archive page** (tag results, search results etc.), it limits the images to those attached to the posts resulting from the query. **[DEMO HERE](http://www.lystfotograf.net/tags/fog "A tag archive page on lystfotograf.net")**. Click an image.


Plugin uses [Imagesloaded](https://github.com/desandro/imagesloaded/ "imagesloaded on GitHub") for smooth appearance. [Hammer.js](http://hammerjs.github.io/ "hammer.js on GitHub") is included to support touch events.

**Suggestions for modifications and enhancements are welcome!**


== Installation ==

1. Upload the plugin to your WordPress plugin directory or install it by using the "Add Plugin" function of WordPress
2. Activate the plugin at the plugin administration page. It is ready to use.
3. Optional: Modify settings in the plugin administration page as desired


== Frequently Asked Questions ==

= I don't see any buttons - how do I operate it? =
Click (tap) in the right part of the window to go to the next image, vice versa to go to previous image. Or swipe left/right.

To show the menu, click nearer to the middle part of the window or around the bottom of the window.

For those who are blessed with a keyboard: 
   
**right arrow/left arrow** - next and previous  
**up arrow/down arrow** - toggle menu  
**A** - toggle autoplay  
**B** - switch background class  
**C** - captions on/off  
**L** - last image  
**S** or **V** - switch style  
**X** - exit  

= Can I choose which pages and images to use it in? =
Yes, this can be specified in the plugin settings page.

= Can I modify the styles? =
Yes. Please have a look into the plugin settings page and the stylesheet located in the plugin directory. If you need advice on how to set up the styles please leave a support message.

If you have any suggestions to enhacements or modifications, feedback is very much appreciated!

= Is it responsive and tablet friendly? =
Yes, I think so. 

= Does it work in all versions of all browsers? =
Most likely not, but it seem to work as expected in 'all modern browsers'.


= Does it work with Infinite Scroll or other lazy-loaders? =
Yes, however, for [Infinite Scroll](http://www.infinite-scroll.com "Infinite Scroll") you have to add some lines to your setup if you want to be able to activate the viewer by clicking the images not initially loaded:

	$container.infinitescroll({
		...
		},
			function( newElements ) {
			var newElems = $( newElements );
			...
			...
			newElems.find('img:first').click(function(e) {
				return( ! WPIV.start($(this)));
				});
			}
		);

In other words: Bind WPIV.start(this) as a handler to the click event for the new images as they are loaded. If the image is inside an anchor element (e.g. as a fallback when no Javascript), prevent following the link by returning 'false' if the viewer ended successfully.

Other lazy-loading implementations may have a different way to set it up, please consult the documentation.

== Screenshots ==

1. Image on square background 1
2. Menu turned on
3. Image on square background 2
4. Image with border
5. Full window. Aspect ratio will always be kept.
6. With captions
7. On bright background
8. Settings page
== Changelog ==
= 1.6 =
* NEW: Handles images in galleries. Modify default gallery container ID or class in plugin admin page if necessary.
* NEW: Handles all images in the post, not only the first
* Miscellaneous improvements
= 1.5 =
* Replaced menu text with font icons
* Tested with WordPress 4.3
= 1.4 =
* Left/right swipe implemented using hammer.js
* Images without height and width attributes defined was not handled very well. Corrected, width and height obtained when not specified. (Leaving out height and width is bad practice, but that's another story).
= 1.3 =
* Handle images stored on other sites
* Posts with no images was not treated properly. Corrected.
= 1.2 =
* NEW: support for using post titles as image caption added - see plugin admin page
* NEW: switch between two background styles - see the user settings section in .css
* Added uninstall script to remove options in database if plugin is uninstalled
* Re-organised folder structure
* Increased robustness
* Updated readme.txt
* Updated screenshots
= 1.1 =
* Corrected some markup blunders
* Minor modifications
* Improved cross-fade action
* Updated readme.txt
* Tested with WordPress 4.2.2

= 1.0 =
* Launch



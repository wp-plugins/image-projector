=== Image Projector ===
Contributors: wpgloe
Tags: image, viewer, lightbox, gallery, slideshow, responsive, dynamic, overlay, photo, prettyphoto, photography, simple, post
Tested up to: 4.2.2
Requires at least: 4.0
Stable tag: 1.4
License: GPLv2 or later
License URI: http://www.gnu.org/licenses/gpl-2.0.html

Less is more. A swift and responsive viewer and slideshow for the published post's first image. Good for photographers. No gallery required.


== Description ==
This plugin provides a responsive full-window viewer and slideshow for the first image in published posts. No gallery or editing of code required - use what's already there! Speed and simplicity has been priority number one.

Convenient for those who runs photography-related websites with one photo per post and does not want the hassle with setting up and maintaining separate galleries - and do not want to load a new page for each photo.

In short:  
*No setup of galleries required  
*Responsive  
*Clean user interface  
*Switch beween styles run-time  
*Post title as caption  
*Can be used as a next/previous post navigator  
*Modify colors, borders and fonts as you like  
*Fast startup  

When activated from a **single-post page**, it allows you to navigate through the first image in all published posts.

When activated from an **archive page** (tag results, search results etc.), it limits the images to the first image attached to the posts resulting from the query.

You can **see it in use** in a single post page [here](http://www.lystfotograf.net/archives/2446 "A single post page on lystfotograf.net") or from a tag archive page [here](http://www.lystfotograf.net/tags/fog "A tag archive page on lystfotograf.net"). Click an image. When opened, clicking in the middle part of the window opens the menu, click in the right/left part of window to navigate. No fancy buttons.

Setup it simple, no action is required except of installing the plugin. It does not need an overwhelming number of customisation options, but there are a few. In addition, the styles can be adjusted to your taste by editing the stylesheet that comes with the plugin.

To be on the conservative side, 'Requires at least' has been set to 4.0, it probably works with older versions as well.

Plugin uses [Desandro's imagesloaded](https://github.com/desandro/imagesloaded "Go to imagesloaded on github") for smooth appearance. This is included in the plugin package, you don't need to install it separately.

Suggestions for modifications are welcome!


== Installation ==

1. Upload the plugin to your WordPress plugin directory or install it by using the "Add Plugin" function of WordPress
2. Activate the plugin at the plugin administration page. It is ready to use.
3. Optional: Modify settings in the plugin administration page as desired


== Frequently Asked Questions ==

= I don't see any buttons - how do I operate it? =
Click (tap) in the right part of the window to go to the next image, vice versa to go to previous image. 
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

= Can I modify the style? =
Yes, to some extent. Please have a look into the plugin settings page and the stylesheet located in the plugin directory.

If you have any suggestions to enhacements or modifications, feedback is very much appreciated!

= Is it responsive and tablet friendly? =
Yes, I think so. It is not particularly aimed at touch-enabled devices, but tapping works of course well...

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
2. With menu turned on
3. Image on square background 2
4. Image with border
5. Full window. Aspect ratio will always be kept.
6. With captions
7. Settings page
== Changelog ==
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



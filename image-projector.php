<?php
defined( 'ABSPATH' ) or die( 'No script kiddies please!' );
/**
 * Plugin Name: Image Projector
 * Plugin URI: http://www.lystfotograf.net/imageprojector
 * Description: A swift viewer and slideshow for the first image in published posts. Good for photographers. No gallery required. 
 * Version: 1.1
 * Author: Christian G
 * Author URI: http://www.lystfotograf.net
 * License: GPL2
*/


// Make up the functionality and attach it to hook -wp-
function wpiv_load_script()
{
	$wpiv_plugin_url = trailingslashit( get_bloginfo('wpurl') ).PLUGINDIR.'/'. dirname( plugin_basename(__FILE__) );
	
	$upload_dir		= wp_upload_dir();
	$options		= get_option('wpiv_options', '');
	$ident			= $options['identifier'];
	$menuh 			= $options['menu_height'];
	$menuovl		= $options['menu_overlay'];
	$autoduration	= $options['auto_duration'];		
	$add_home		= $options['add_home'];
	$add_single		= $options['add_single'];
	$add_archive	= $options['add_archive'];	
	$expected		= $options['expected_loadtime'];
	$fadeduration	= $options['fade_duration'];
	
	if(!$ident) $ident = "img";
	if (!is_admin() && ((is_single() && $add_single == '1')
		|| (is_home() && $add_home == '1') 
		|| (is_archive() && $add_archive == '1')))
	{
		
		//Create reference file if it does not exist. It's quick.
		$localfile = plugin_dir_path( __FILE__ )."/wpiv_ref.js";
		if(!file_exists($localfile)) wpiv_generate_postimage_reference_js();
	
	
		//Re-execute with no paging to get the number of posts (will be the number of slides) of current query.
		//This may seem a bit heavy, but it is lightening fast - and there are probably no other ways
		if(is_archive() && $add_archive == '1') {

			global $query_string;
			$temp_result = get_posts($query_string.'&posts_per_page=-1;&order=ASC');
			$numArray=count($temp_result);
			$jArrayString = "0,";
			for($i=0;$i<$numArray;$i++){
				$jArrayString .=  $temp_result[$i]->ID;
				if($i < $numArray-1){ $jArrayString .= ',';}
			}
		} else{
			global $post;
			$jArray="";//"0,".$post->ID;
		}
	wp_register_style( 'wpiv_style',  $wpiv_plugin_url.'/wpiv_style.css');
	wp_enqueue_style( 'wpiv_style');
	
	wp_register_script( 'wpiv_reference',  $wpiv_plugin_url.'/wpiv_ref.js',array(),null);
	wp_enqueue_script( 'wpiv_reference');
	
	wp_register_script( 'wpiv_script',  $wpiv_plugin_url.'/post-image-viewer.js',array('jquery'),false);
	wp_localize_script( 'wpiv_script', 'WPIVConfig', array(
		//system variables
		'bindto'			=> $ident,
		'postString'		=> $jArrayString,
		'wpPluginUrl'		=> $wpiv_plugin_url,
		'wpUploadUrl'		=> $upload_dir['baseurl'],
		
		//user interface
		'menuHeight'		=> intval($menuh),
		'menuOverlay'		=> $menuovl,			
		'autoDuration'		=> intval($autoduration),
		'expectedLoadtime'	=> intval($expected),
		'fadeDuration'		=> intval($fadeduration),
		)
		);
	wp_enqueue_script( 'wpiv_script');
	}
}
add_action('wp', 'wpiv_load_script');


/**
 * Load other scripts, hook it on -wp_enqueue_scripts-
*/
function wpiv_load_external_scripts() {
	$wpiv_plugin_url = trailingslashit( get_bloginfo('wpurl') ).PLUGINDIR.'/'. dirname( plugin_basename(__FILE__) );

	wp_register_script( 'imagesloaded',  $wpiv_plugin_url.'/imagesloaded.pkgd.min.js',array(),false);
	wp_enqueue_script( 'imagesloaded');
}
add_action( 'wp_enqueue_scripts', 'wpiv_load_external_scripts' );

/**
 * Create a post reference file. Get post information from database and into a js-array, write it to an external .js file. 
 * Hook it on -deleted_post- and -save_post-
 * Also executed when starting the viewer if no reference file is found. 
*/
 
function wpiv_generate_postimage_reference_js() {

	$upload_dir = wp_upload_dir();
	$remove = $upload_dir['baseurl'];

	$pinfo = array();

	$localdir = plugin_dir_path( __FILE__ );
	$jsFile = $localdir."/wpiv_ref.js";

	$handle = fopen($jsFile,"w");

	global $wpdb;
	$querystr = "SELECT $wpdb->posts.* FROM $wpdb->posts WHERE $wpdb->posts.post_status = 'publish' AND $wpdb->posts.post_type = 'post' ";
	$pageposts = $wpdb->get_results($querystr, OBJECT);
	$numrows = $wpdb->num_rows;
	$counts = 0 ;
	if ($pageposts):
		fwrite($handle, 'var seqArray = [];seqArray=[[0,0,0,0],');

		foreach ($pageposts as $post):
			$counts++;
			$pinfo = wpiv_get_first_post_image($post->ID);
			$localfile = str_replace($remove,"",$pinfo[name]);
			fwrite($handle, '['.$post->ID.','.$pinfo[width].','.$pinfo[height].',"'.$localfile.'"]');
			if($counts<$numrows) fwrite($handle, ',');
		endforeach;
		
		fwrite($handle, '];');
		fwrite($handle, 'var listArray = [];listArray=[0,');
		$i=1;
		
		foreach ($pageposts as $post):
			fwrite($handle, $i);
			if($i<$counts) fwrite($handle, ',');
			$i++;
		endforeach;
		
		fwrite($handle, '];');
		
	endif;
	fclose($handle);
}  
add_action ( 'deleted_post', 'wpiv_generate_postimage_reference_js' );
add_action ( 'save_post', 'wpiv_generate_postimage_reference_js' );


/**
 * For increased performance when loading first image, a data-attribute -postid- containing the post ID can be added to img element.
 * Even better: a data-attribute -seqno- with the current posts sequence number in the sequence of published posts
 * Add as a filter to -the_content- May also be added manually, then the below filter can be commented out.
*/
function wpiv_img_add_postid($content) {
	global $post;
	// this may not be a fool-proof way to do it, a bit quick and dirty. TODO: make it robust	
	$replaceto = "img data-postid='$post->ID'";
	$retval = str_replace ("img ",$replaceto,$content);

	return $retval;
}
add_filter('the_content', 'wpiv_img_add_postid');

/**
 * Extract the image file name, width and height of the first image in the post
*/
function wpiv_get_first_post_image($postid) {
	global $wpdb;
	$thispost = get_post($postid);

	$output = preg_match_all('/<img.+src=[\'"]([^\'"]+)[\'"].*>/i', $thispost->post_content, $matches);
	if ( isset($matches[1][0]) ) $img = $matches[1][0];

	preg_match_all('/<img.+width=[\'"]([^\'"]+)[\'"].*>/i',$thispost->post_content, $sizes);
	if ( isset($sizes[1][0]) ) $width = $sizes[1][0];

	preg_match_all('/<img.+height=[\'"]([^\'"]+)[\'"].*>/i',$thispost->post_content, $sizes);
	if ( isset($sizes[1][0]) ) $height =$sizes[1][0];

	$return 			= array();
	$return['name'] 	= trim($img);
	$return['width'] 	= $width;
	$return['height'] 	= $height;

	return $return;
}

/**
 * The plugin admin page
*/
class WPIVSettingsPage
{
    private $options;

    public function __construct()
    {
        add_action( 'admin_menu', array( $this, 'add_plugin_page' ) );
        add_action( 'admin_init', array( $this, 'page_init' ) );
    }

    public function add_plugin_page()
    {
        add_options_page('Settings Admin', 'Image Projector',   'manage_options', 'wpiv-setting-admin', array( $this, 'create_admin_page' )
        );
    }

    public function create_admin_page()
    {
 
        $this->options = get_option( 'wpiv_options' );
		if(!isset($this->options['add_single'])) $this->options['add_single'] = '1';
		if(!isset($this->options['add_archive'])) $this->options['add_archive'] = '1';
		if(!isset($this->options['add_home'])) $this->options['add_home'] = '2';
		if(!isset($this->options['menu_overlay'])) $this->options['menu_overlay'] = '1';		
		
        ?>
        <div class="wrap">
            <h2>Image Projector</h2>           
            <form method="post" action="options.php">
            <?php

                settings_fields( 'wpiv_option_group' );
	
                do_settings_sections( 'wpiv-setting-admin' );
                submit_button(); 
            ?>
            </form>
        </div>
        <?php
    }

    public function page_init()
    {   
        register_setting(
            'wpiv_option_group', 'wpiv_options', array( $this, 'sanitize' )
        );
		// setting section 'Activate' 
        add_settings_section(
            'wpiv_settings_main', 'Activation</i>', array( $this, 'print_main_section_info' ), 
            'wpiv-setting-admin'
        );  
         add_settings_field(
            'identifier', 'Image element identifier(s)',  array( $this, 'identifier_callback' ), 
            'wpiv-setting-admin', 'wpiv_settings_main'
        );
	  
		add_settings_field(
            'add_home', 'Use on home page', array( $this, 'add_home_callback' ), 
            'wpiv-setting-admin', 'wpiv_settings_main'
        );
		add_settings_field(
            'add_archive', 'Use on archive pages', array( $this, 'add_archive_callback' ), 
            'wpiv-setting-admin', 'wpiv_settings_main'
        );	
		add_settings_field(
            'add_single', 'Use on single post pages', array( $this, 'add_single_callback' ), 
            'wpiv-setting-admin', 'wpiv_settings_main'
        );
		add_settings_field(
            'expected_loadtime', 'Max expected load time', array( $this, 'expected_loadtime_callback' ), 
            'wpiv-setting-admin', 'wpiv_settings_main'
        );					
		// setting section 'User interface' 
		add_settings_section(
            'wpiv_settings_layout','User interface', array( $this, 'print_layout_section_info' ), 
            'wpiv-setting-admin' 
        );
        add_settings_field('menu_overlay', 'Menu shall overlay', array( $this, 'menu_overlay_callback' ), 
            'wpiv-setting-admin', 'wpiv_settings_layout'
        );		
        add_settings_field(
            'menu_height', 'Height of menu', array( $this, 'menu_height_callback' ), 
            'wpiv-setting-admin', 'wpiv_settings_layout'
        );
        add_settings_field(
            'auto_duration', 'Time to next slide (auto)', array( $this, 'auto_duration_callback' ), 
            'wpiv-setting-admin', 'wpiv_settings_layout'
        );		
		add_settings_field(
			'fade_duration', 'Cross-fade duration', array( $this, 'fade_duration_callback' ), 
			'wpiv-setting-admin', 'wpiv_settings_layout'
		);		
    }

    public function sanitize( $input )
    {
        $new_input = array();

        if( isset( $input['identifier'] ) )
            $new_input['identifier'] = sanitize_text_field( $input['identifier'] );

		$new_input['add_home'] = $input['add_home'];
		if( !isset( $input['add_home'] ) ) $new_input['add_home'] = '2';
   
		$new_input['add_archive'] = $input['add_archive'];
		if( !isset( $input['add_archive'] ) ) $new_input['add_archive'] = '2';
		

		$new_input['add_single'] = $input['add_single'];
		if( !isset( $input['add_single'] ) ) $new_input['add_single'] = '2';			


		if( isset( $input['expected_loadtime'] ) ){
		$new_input['expected_loadtime'] = sanitize_text_field( $input['expected_loadtime'] );
		 if(intval($new_input['expected_loadtime'])<1) {
			 $new_input['expected_loadtime']="1";
			 }
		 }	
		
		if( isset( $input['menu_height'] ) ){
			$new_input['menu_height'] = sanitize_text_field( $input['menu_height'] );
			 if(intval($new_input['menu_height'])<30 || intval($new_input['menu_height'])>200) {
				 $new_input['menu_height']="30";
				 }
			 }		


		$new_input['menu_overlay'] = $input['menu_overlay'];
		if( !isset( $input['menu_overlay'] ) ) $new_input['menu_overlay'] = '2';

			
		if( isset( $input['auto_duration'] ) ){
			$new_input['auto_duration'] = sanitize_text_field( $input['auto_duration'] );
			 if(intval($new_input['auto_duration'])<3) {
				 $new_input['auto_duration']="3";
				 }
			 }
		if( isset( $input['fade_duration'] ) ){
		$new_input['fade_duration'] = sanitize_text_field( $input['fade_duration'] );
		 if(intval($new_input['fade_duration'])<1) {
			 $new_input['fade_duration']='700';
			 }
		 }		 
	 
        return $new_input;
    }

    public function print_main_section_info()
    {

        print  "Unless specified below, all image elements will open in this plugin. You may limit the images by  giving one or more element ids and/or class names, separated by comma. Example: <i>#postimage, .masonryimage</i>";
    }
    public function print_layout_section_info()
    {
	
        print  "";
    }

    public function identifier_callback()
    {   
        printf(
            '<input type="text" style="width:500px" id="identifier" name="wpiv_options[identifier]" value="%s" />',
            isset( $this->options['identifier'] ) ? esc_attr( $this->options['identifier']) : ''
        );

    }
    public function add_home_callback()
    {

        printf(
            '<input type="checkbox" id="add_home" value="1" name="wpiv_options[add_home]" value="1"' . checked( 1, $this->options['add_home'], false ) . '/>'
	

        );
    }
	public function add_archive_callback()
    {

        printf(
            '<input type="checkbox" id="add_archive" value="1" name="wpiv_options[add_archive]" value="1"' . checked( 1, $this->options['add_archive'], false ) . '/>'

        );
    }	
	public function add_single_callback()
    {

        printf(
            '<input type="checkbox" id="add_single" value="1" name="wpiv_options[add_single]" value="1"' . checked( 1, $this->options['add_single'], false ) . '/>'
	
        );
		
    }	
	public function expected_loadtime_callback()
    {
        printf(
            '<input type="text" style="width:40px" id="expected_loadtime" name="wpiv_options[expected_loadtime]" value="%s" >&nbsp;[seconds] waiting time before &lsquo;slow connection &rsquo; message appears</input>',
            isset( $this->options['expected_loadtime'] ) ? esc_attr( $this->options['expected_loadtime']) : '4'
        );
    }		
    public function menu_overlay_callback()
    {

        printf(
            '<input type="checkbox" id="menu_overlay" value="1" name="wpiv_options[menu_overlay]" value="1"' . checked( 1, $this->options['menu_overlay'], false ) . '/>'

        );
    }		
    public function menu_height_callback()
    {
        printf(
            '<input type="text" style="width:40px" id="menu_overlay" name="wpiv_options[menu_height]" value="%s" >&nbsp;[pixels] 30 to 200</input>',
            isset( $this->options['menu_height'] ) ? esc_attr( $this->options['menu_height']) : '50'
        );
    }	 
	public function auto_duration_callback()
    {
        printf(
            '<input type="text" style="width:40px" id="auto_duration" name="wpiv_options[auto_duration]" value="%s" >&nbsp;[seconds] minimum 3</input>',
            isset( $this->options['auto_duration'] ) ? esc_attr( $this->options['auto_duration']) : '3'
        );
    }	
	public function fade_duration_callback()
    {
        printf(
            '<input type="text" style="width:50px" id="fade_duration" name="wpiv_options[fade_duration]" value="%s" >&nbsp;[milliseconds] minimum 1</input>',
            isset( $this->options['fade_duration'] ) ? esc_attr( $this->options['fade_duration']) : '700'
        );
    }		
}

if( is_admin() )
    $wpiv_settings_page = new WPIVSettingsPage();
?>
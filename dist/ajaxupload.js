/*
	AjaxUpload script by Yunus Tabakoğlu
	Version: 1.0.1 (Development Version)
*/

(function( $ ){
	var fileCount = 3236;
	var scriptEls = document.getElementsByTagName( 'script' );
	var thisScriptEl = scriptEls[scriptEls.length - 1];
	var scriptPath = thisScriptEl.src;
	var scriptFolder = scriptPath.substr(0, scriptPath.lastIndexOf( '/' )+1 );
	var scriptDir = scriptFolder.replace("/script/","/");

	var ua = window.navigator.userAgent;
	
	var mouseDown = false;
	var Dragging = false;
	
	var fileIcons = {};
	var uploadInstances = {};
	
	var previewTypes = ['jpg','jpeg','bmp','png','gif'];
	
	$(document).one("ajaxUpload:Setup", function(){
		var hiddenFile = '<input type="file" class="ajaxUpload_hiddenFile" multiple></input>';
		$("body").append(hiddenFile);
		
		$(document).on("dragenter", function(){
			$("div.ajaxUpload_Base:not(.dragto) .placeHolder").addClass("fadeOut").one('webkitAnimationEnd oanimationend msAnimationEnd animationend', function() {
				$(this).removeClass("fadeOut");
				$(this).hide();
			});
			$(".ajaxUpload_Base").addClass("dragto");
			Dragging = true;
		});
		$(document).on("dragover", function(e){
			e.stopPropagation();
    		e.preventDefault();
		});
		$(document).on('drop.globaldrop', function (e) 
		{
			e.stopPropagation();
			e.preventDefault();
			ajaxUpload_ResetStatus();
		});
		$(document).mousedown(function(e){ if(e.which === 1) { mouseDown = true; } });
		$(document).mouseup(function(e){ if(e.which === 1) { mouseDown = false; } });
		function controlMouse(e){
			if (/*$.browser.msie*/ ua.indexOf("MSIE ")>0 && (document.documentMode < 9) && !event.button) { mouseDown = false; }
			if(e.which === 1 && !mouseDown) { e.which = 0; }
		}
		$(document).mousemove(function(e) { controlMouse(e); if(e.which === 0){ ajaxUpload_ResetStatus(); } });
	});

	$.fn.ajaxUpload = function(options)
	{
				
		$(document).trigger("ajaxUpload:Setup");
		
		if (this.length > 1){
			this.each(function() { $(this).ajaxUpload(options); });
			return this;
		}	
		
		var settings = $.extend({
			debug: true, // Prints out errors on the console.
			fileTypes: [], // Array of extension strings ("jpg", "pdf", "etc")
			uploadHandler: false, // Backend script url
			preventDuplicates: true, // Prevents the same file to be uploaded when true.
			description: true, // Activates/deactivates the description area.
			formSelector: "", // Custom form to be hooked to. Parent form by default (Empty string).
			deleteText: "", // String for the delete button. Image by default (Empty string).
			maxFiles: 10, // Maximum amount of files allowed on the files list.
			maxSize: 0, // Kilobytes value. 0 is Unlimited
			cssIcons: true, // File icons defined by the css file when true. If not script checks the filetypes folder for the filetype image.
			allowDrop: false, // Prevents dropping on objects other than uploader. Must be called false in all instances of ajaxUpload to prevent.
			triggerCommandOnRemove: true, //Sends a trigger to the upload handler when a file gets removed from the interface.
			injectType: "array", // "array" (default) or "indexed". Defines how ajaxUpload injects file data to the parent form.
				
			// Ajax upload handler commands
				
			handler_CommandKey: "command", // Main $_POST key for the upload handler command.
			handler_uploadCommand: "ajaxUploadSingle", // Command for upload.
			handler_removeCommand: "ajaxRemoveSingle", // Command for removal.
			handler_removeKey: "fileToRemove", // $_POST key for the file to be removed.
			handler_removeSelector: "filename", // $_POST data for the file to be removed. Must be one of the return data from uploadHandler
			handler_fileKey: "file",
			handler_DescriptionKey: "description",
				
			// Form fill data
				
			inputClass: "ajaxUpload_Input", // Class for the inputs to be injected to the form.
			formPrefix: "ajaxUpload_", // Prefix for the inputs to be injected to the form.
			formKeySeperator: "_", // Seperator for the form key names in the inputs to be injected to the form.
			
			fileIDPrefix: "file", // Prefix for the file ID. This is the main selector for the uploaded files.
				
			inputName_FileList: "files",
				
			text_DescriptionPlaceHolder: "Enter description here.",
			text_PlaceHolder: "<span class=\"centerdialog\"><div class=\"addicon\"></div>Add your files here...</span>",
			text_DropIndicator: "<span class=\"centerdialog\">Yes, drop them up here...</span>",
			text_MaxFileCountExceeded: "You can't upload more than [maxFiles] files.",
			text_MaxFileSizeExceeded: "The file [filename] exceeds the maximum file size ([maxSize]kb).",
			text_InvalidFileType: "The file extension \".[extension]\" is not permitted.",
			text_FileIsDuplicate: "The file \"[filename]\" already exists in the uploads list.",
		}, options );
			
		if(settings.allowDrop){
			$(document).off(".globaldrop");
			$(document).on('drop.globaldrop', function () 
			{  ajaxUpload_ResetStatus(); });
		}
			
		//Object Events
			
		var Obj = $(this);
		var UploadedFiles = {};
		Obj.addClass("ajaxUpload_Base");
		if(settings.cssIcons){ Obj.addClass("cssIcons"); }
		if(!settings.uploadHandler){
			settings.uploadHandler = Obj.closest('form').attr('action');
		}
		
		if($.trim(Obj.html())!==""){ settings.text_PlaceHolder = Obj.html(); }
		Obj.html("");
			
		/*Obj.on('dragenter', function (e) {
			e.preventDefault();
			Obj.addClass("dragto");
		});*/
		Obj.on('drop', function (e) {
			e.preventDefault();
			var Files = e.originalEvent.dataTransfer.files;
			handleUpload(Files);
		});
		Obj.on('click', function(e) { 
			ajaxUpload_ResetStatus();
			if( e.target !== this && !$(e.target).hasClass('files') && !$(e.target).hasClass('ajaxUploadDialog') && !$(e.target).parents('.ajaxUploadDialog').length > 0 ) 
				{  return; }
			$('input.ajaxUpload_hiddenFile').off( ".clickuploader" );
			$('input.ajaxUpload_hiddenFile').one("change.clickuploader", function(){
				handleUpload(this.files);
			});
			$('input.ajaxUpload_hiddenFile').click();
		});
			
		Obj.on("click", "a.button_Remove", function(){ removeFile($(this).parent(".file")); });
			
		// Form Settings
			
		var Form = false;
			
		if(settings.formSelector === ""){
			if($(Obj).closest("form").length>0)
			{ Form = $(Obj).closest("form"); }
			else { console.log("ajaxUpload Fatal Error: No forms found near the ajaxUpload object."); return; }
		}
		else{
			if($(settings.formSelector).length>0)
			{ Form = $(settings.formSelector); }
			else{ console.log("ajaxUpload Fatal Error: Form selector \"'"+settings.formSelector+"\" not found."); return; }
		}
			
		Form.on("submit", function(e)
		{
			var UploadForm = $(this);
			UploadForm.find('input[type="hidden"].'+settings.inputClass).remove();
			e.preventDefault();
				
			$.each(UploadedFiles, function(FileKey, FileToUpload){
				if(Obj.children(".files").children(".file#"+FileKey).length>0 && FileToUpload["complete"])
				{
					if(settings.description){
						FileToUpload["data"][settings.handler_DescriptionKey] = Obj.children(".files").children(".file#"+FileKey).children("textarea.description").val();
					}
						
					var TheKey = $('<input class="'+settings.inputClass+'" type="hidden" name="'+settings.formPrefix+settings.inputName_FileList+'[]" value="'+FileKey+'" />');
					UploadForm.append(TheKey);
						
					$.each(FileToUpload["data"], function(Attr_Key, Attr_Value){
						var Detail;
						if(settings.injectType === "indexed")
						{ Detail = $('<input class="'+settings.inputClass+'" type="hidden" name="'+settings.formPrefix+FileKey+settings.formKeySeperator+Attr_Key+'" value="'+Attr_Value+'" />'); }
						else{ Detail = $('<input class="'+settings.inputClass+'" type="hidden" name="'+settings.formPrefix+Attr_Key+'[]" value="'+Attr_Value+'" />'); }
						UploadForm.append(Detail);
						//console.log("  "+keykey+": "+valvalue);
					});
				}
			});
		});
			
		// Misc
		
		Obj.deleteFile = function(FileToRemove)
		{
			removeFile(FileToRemove); //removeFile(File);
		};
		
		Obj.files = function()
		{
			return UploadedFiles;
		};
			
		// Upload			
			
		var dragIndicator = '<div class="dragIndicator ajaxUploadDialog">'+settings.text_DropIndicator+'</div>';
		var placeHolder = '<div class="placeHolder ajaxUploadDialog">'+settings.text_PlaceHolder+'</div>';
		var files = '<div class="files"></div>';
		Obj.append(files);
		Obj.append(placeHolder);
		Obj.append(dragIndicator);
			
		function handleUpload(Files)
		{
			if(settings.maxFiles > 0 && Files.length + Obj.children(".files").find(".file").length > settings.maxFiles)
			{
				alert(settings.text_MaxFileCountExceeded.replace("[maxFiles]",settings.maxFiles));
				return;
			}
				
			for (var i = 0; i < Files.length; i++) 
			{
				var fileExt = Files[i].name.split('.').pop().toLowerCase();
				if(settings.fileTypes.length > 0)
				{
					if($.inArray(fileExt, settings.fileTypes) === -1){
						alert(settings.text_InvalidFileType.replace("[extension]",fileExt));
						return; 
					}
				}
				if(settings.maxSize > 0 && Files[i].size > settings.maxSize*1024)
				{
					alert(settings.text_MaxFileSizeExceeded.replace("[maxSize]",settings.maxSize).replace("[filename]",Files[i].name));
					return;
				}
				
				var Duplicate = false;
				if(settings.preventDuplicates)
				{
					$.map(UploadedFiles, function(File) {
						if (File.size === Files[i].size && File.filename === Files[i].name) {
							Duplicate = true;
						}
					});
					/*$.each(UploadedFiles, function(FileKey, File){
						if(File["size"] == Files[i].size && File["filename"] == Files[i].name){
							Duplicate = true;
						}
					});*/
				}
				if(Duplicate){
					alert(settings.text_FileIsDuplicate.replace("[filename]",Files[i].name));
					return;
				}
				
				var fileID = settings.fileIDPrefix+fileCount;
				fileCount++;
					
				var File = $('<div class="file" id="'+fileID+'" filetype="'+fileExt+'"><a class="button_Remove">'+settings.deleteText+'</a><div class="thumb"></div><span class="name">'+Files[i].name+'</span></div>');
				if(settings.description){ File.append('<textarea class="description" placeholder="'+settings.text_DescriptionPlaceHolder+'"></textarea>'); }
				if(settings.deleteText===""){ File.children(".button_Remove").addClass("image"); }
				
				UploadedFiles[fileID] = {"complete":false, "filename":Files[i].name, "size":Files[i].size, "data":{}};
				
				$(File).appendTo(Obj.children(".files:first")).addClass("fadeIn").one('webkitAnimationEnd oanimationend msAnimationEnd animationend', function() {
					$(this).removeClass("fadeIn");
				});
				ajaxUpload_ResetStatus();
					
				if($.inArray(fileExt, previewTypes) > -1)
				{ putImg(Files[i], File.find("div.thumb"), function(Data, Img) { Img.css("background-image", "url("+Data+")"); }); }
				else if(!settings.cssIcons){
					if(fileExt in fileIcons){ File.children("div.thumb").css("background-image", "url("+fileIcons[fileExt]+")"); }
					else{
						checkExtIcon(fileExt);
					}
				}
					
					
				//if(settings.autoUpload)
				//{
					sendFile(Files[i], fileID);
				//}
				Obj.trigger("ajaxUpload:FileAdd", [fileID, Files[i]]); 
			}
		}	

		function removeFile(File)
		{
			if($.type(File) === "string"){ File = Obj.children(".files").children(".file#"+File); }
			else if($.type(File) !== "object"){
				if(settings.debug){ console.log("ajaxUpload error: Type of input must be either object or string."); }
				return;
			}
			if(Obj.children(".files").children(".file#"+File.attr("id")).length > 0)
			{
				var FileID = $(File).attr("id");
				
				if(FileID in UploadedFiles)
				{
					if(settings.triggerCommandOnRemove)
					{
						var Values = {};
						Values[settings.handler_CommandKey] = settings.handler_removeCommand;
						Values[settings.handler_removeKey] = UploadedFiles[FileID]['data'][settings.handler_removeSelector];
						$.ajax({
							url:settings.uploadHandler,
							type: "POST",
							data: Values
						});
					}
						
					delete UploadedFiles[FileID];
				}
				else{
					uploadInstances[FileID].abort();
				}
					
				$(File).addClass("fadeOut").one('webkitAnimationEnd oanimationend msAnimationEnd animationend', function() {
					if($(this).next(".file").length>0)
					{
						$(this).next(".file").addClass("slideLeft").one('webkitAnimationEnd oanimationend msAnimationEnd animationend', function() {
							$(this).removeClass("slideLeft");
							$(File).remove();
							Obj.trigger("ajaxUpload:FileRemove", [FileID, File]); 
							ajaxUpload_ResetStatus();
						});
					}
					else{ $(File).remove(); Obj.trigger("ajaxUpload:FileRemove", [FileID, File]);  ajaxUpload_ResetStatus(); }
				});
			}
			else if(settings.debug){ console.log("File to be removed ("+File+") doesn't exist."); }
		}

		function putImg(File, Container, Callback) {
			var reader = new FileReader();
			reader.onload = function() { Callback(reader.result, Container); };
			reader.readAsDataURL(File);
		}
			
		function checkExtIcon(Ext) {
			var URL = scriptDir+"img/filetypes/icon_file_"+Ext+".png";
			$.ajax({
				url:URL,
				type:'HEAD',
				/*error: function()
				{ },*/
				success: function() {
					fileIcons[Ext] = URL;
					Obj.children('.files').find('div.file').each(function(){
						$(this).children('div.file[filetype="'+Ext+'"] div.thumb').css("background-image", "url("+fileIcons[Ext]+")");
					});
				}
			});
		}
			
		function sendFile(File, fileID)
		{
			var formData = new FormData();
			formData.append(settings.handler_fileKey, File);
			formData.append(settings.handler_CommandKey, settings.handler_uploadCommand);
			
			uploadInstances[fileID] =
			$.ajax({
				xhr: function() {
				var xhrobj = $.ajaxSettings.xhr();
				if (xhrobj.upload) {
					xhrobj.upload.addEventListener('progress', function(event) {
						var percent = 0;
						var position = event.loaded || event.position;
						var total = event.total;
						if (event.lengthComputable) {
							percent = Math.ceil(position / total * 100);
						}
						setUploadStatus(percent, fileID);
					}, false);
				}
				return xhrobj;
			},
			url: settings.uploadHandler,
			type: "POST",
			contentType:false,
			processData: false,
				cache: false,
				data: formData,
				success: function(data){
					File = $.parseJSON(data);
					if(File.status === "ok" && Obj.find(".files #"+fileID).length>0)
					{
						Obj.find(".files #"+fileID+" div.progressBar").remove();
						File.data.uploadFileName = Obj.find(".files #"+fileID).children("span.name").text();
						UploadedFiles[fileID]["complete"] = true;
						UploadedFiles[fileID]["data"] = File.data;
						Obj.find(".files #"+fileID).addClass("uploaded");  
						
						Obj.trigger("ajaxUpload:UploadComplete", [fileID, File]); 
					}
					else if(File.status === "error"){
						Obj.trigger("ajaxUpload:UploadError", [fileID, File, "expected", "server", File.error]);
						if(settings.debug){
							console.log("ajaxUpload server side error: \""+File.error+"\"");
						}
						Obj.find(".files #"+fileID).addClass("failed");  
					}
					else{
						Obj.trigger("ajaxUpload:UploadError", [fileID, File, "unexpected", "server", data]);
						if(settings.debug){
							console.log("ajaxUpload unexpected server side input: \""+File.error+"\"");
						}
						Obj.find(".files #"+fileID).addClass("failed");  
					}
				},
				error: function(request, status, error)
				{
					Obj.find(".files #"+fileID).addClass("failed");  
					if(error !== "abort")
					{
						Obj.trigger("ajaxUpload:UploadError", [fileID, File, "unexpected", "ajax", request.responseText, error]);
						if(settings.debug){ console.log("ajaxUpload unexpected ajax error:\nResponse: \""+request.responseText+"\" \nError: \""+error+"\""); }
					}
					else{
						Obj.trigger("ajaxUpload:UploadAbort", [fileID, File]); 
						if(settings.debug){ console.log("ajaxUpload aborted. File: "+fileID); }
					}
				}
			}); 
				
		}
			
		function setUploadStatus(Status, fileID)
		{
			if(Obj.find(".files #"+fileID).length>0)
			{
				if(Obj.find(".files #"+fileID).find("div.progressBar").length<1)
				{
					var ProgressBar = $('<div class="progressBar"><div class="progress"></div></div>');
					ProgressBar.appendTo(Obj.find(".files #"+fileID));
				}
				var Progress = Obj.find(".files #"+fileID+" div.progressBar div.progress");
				Progress.css("width", Status+"%");
			}
		}
		return Obj;
	};
	
	function ajaxUpload_ResetStatus(){
		if(Dragging)
		{
			Dragging = false;
			$("div.ajaxUpload_Base.dragto .dragIndicator").addClass("fadeOut").one('webkitAnimationEnd oanimationend msAnimationEnd animationend', function() {
				$(this).removeClass("fadeOut"); $(".ajaxUpload_Base").removeClass("dragto");
				
				$("div.ajaxUpload_Base:not(.dragto)").each(function(index, element) {
                    if($(this).children(".files").find(".file").length === 0)
					{
						if(!$(this).children(".placeHolder").hasClass("fadeIn") && $(this).children(".placeHolder").is(":not(:visible)"))
						{
							$(this).children(".placeHolder").addClass("fadeIn").show().one('webkitAnimationEnd oanimationend msAnimationEnd animationend', function() {
								$(this).removeClass("fadeIn");
							});
						}
					}
					else
					{
						if(!$(this).children(".placeHolder").hasClass("fadeOut") && $(this).children(".placeHolder").is(":visible"))
						{
							$(this).children(".placeHolder").addClass("fadeOut").one('webkitAnimationEnd oanimationend msAnimationEnd animationend', function() {
								$(this).removeClass("fadeOut");
								$(this).hide();
							});
						}
					}
                });
			});
		}
		else if($("div.ajaxUpload_Base:not(.dragto)").length>0){
			$("div.ajaxUpload_Base:not(.dragto)").each(function(index, element) {
            	if($(this).children(".files").find(".file").length === 0)
				{
					if(!$(this).children(".placeHolder").hasClass("fadeIn") && $(this).children(".placeHolder").is(":not(:visible)"))
					{
						$(this).children(".placeHolder").addClass("fadeIn").show().one('webkitAnimationEnd oanimationend msAnimationEnd animationend', function() {
							$(this).removeClass("fadeIn");
						});
					}
				}
				else
				{
					if(!$(this).children(".placeHolder").hasClass("fadeOut") && $(this).children(".placeHolder").is(":visible"))
					{
						$(this).children(".placeHolder").addClass("fadeOut").one('webkitAnimationEnd oanimationend msAnimationEnd animationend', function() {
							$(this).removeClass("fadeOut");
							$(this).hide();
						});
					}
				}
             });
		}
	}

})( jQuery );
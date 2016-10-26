<?php
	$uploaddir = '../docs/demo/uploads/temp/';
	$file_timeout = 60*60*0.5; //Sec, Min, Hr
	
	// DO NOT USE DESCRIPTION AS RETURN VALUE
	
	if(isset($_POST["command"], $_FILES["file"]) && $_POST["command"] == "ajaxUploadSingle")
	{
		$error = false;
		$data = array();
		
		$file = $_FILES["file"];
		$filename_array = explode(".", $file['name']);
		$filename = RandomString().".".end($filename_array);
			
		while(file_exists($uploaddir.$filename))
		{ $filename = RandomString().".".end((explode(".", $file['name']))); }
			
		if(move_uploaded_file($file['tmp_name'], $uploaddir .$filename))
		{
			$data = array("filename" => $filename);
		}
		else
		{
			$error = true;
		}
			
		$data = ($error) ? array('status' => 'error', 'error' => 'There was an error uploading files.') : array('status' => 'ok', 'data' => $data);
	}
	else if(isset($_POST["command"], $_POST["fileToRemove"]) && $_POST["command"] == "ajaxRemoveSingle")
	{
		if(file_exists($uploaddir.$_POST["fileToRemove"]))
		{ unlink($uploaddir.$_POST["fileToRemove"]); }
	}
	else{ $data = array('status' => 'error', 'error' => 'No input.'); }
	
	echo json_encode($data);
	Cleanup();
	
	
	function RandomString($length=40)
	{
		$characters = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
		$charactersLength = strlen($characters);
		$randomString = '';
		for ($i = 0; $i < $length; $i++) {
			$randomString .= $characters[rand(0, $charactersLength - 1)];
		}
		return $randomString;
	}
	
	function Cleanup()
	{
		global $uploaddir;
		global $file_timeout;
		$now = time();
		foreach (glob($uploaddir."*") as $file)
		{
			if (is_file($file))
			{
				if ($now - filemtime($file) >= $file_timeout)
				{ unlink($file); }
			}
		}
	}
?>
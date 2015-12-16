head.ready(function(){

//model for singular task
var Task = Backbone.Model.extend({
	defaults : {
		title : "",
		sub : false,
		fin : false,
		pos : 0
	}
});

//collection for tasks
var Task_Collection = Backbone.Collection.extend({
	model : Task
});

//list view
var ListView = Backbone.View.extend({
	el : "#listview",
	initialize : function(){
		//check for localStorage - tasks are stored locally and retrieved on refresh
		if(!!window.localStorage){
			//why not Task_Collection?
			this.taskColl = new Backbone.Collection();
			this.taskColl.localStorage = new Backbone.LocalStorage("tasks");
			//check for previously saved tasks in localStorage
			if(localStorage.getItem("tasks")){
				this.taskColl.fetch();
				this.display_from_storage();
			}
		}else{
			$("#msg").text("Unable to find localStorage. Please use a browser with localStorage enabled");
		}
	},
	is : {
		subtasked : false,
		shift_down : false
	},
	count : {
		total : 0,
		fin : 0
	},
	events : {
		"keydown :input" : "key_down",
		"keyup :input" : "key_up"
	},
	key_down : function(e){
		//clear user message on keypress 
		$("#msg").text("");
		
		//enter key pressed
		if (e.keyCode === 13){
			this.enter_control(e);
		//tab key pressed
		}else if(e.keyCode === 9){
			e.preventDefault();
			this.tab_control(e);
		//backspace key pressed
		}else if(e.keyCode === 8){
			this.backspace_control(e);
		//up or down key pressed
		}else if(e.keyCode === 38 || e.keyCode === 40){
			this.arrow_control(e);
		//shift key pressed
		}else if(e.keyCode === 16){
			this.shift_control(e,true);
		}
	},
	key_up : function(e){
		//save our stuff
		this.save_n_store(e);
		
		//check for shift pressed
		if(e.keyCode === 16){
			this.shift_control(e,false);
		}
	},
	display_from_storage : function(){
		$("#list").html("");
		var first = true;
		var final_output = new Array();
		this.taskColl.each(function(task){
			var specs = task.get("sub")?"subtask ":"";
			specs += task.get("fin")?"finished":"";
			final_output[task.get("pos")] = '<div class="task '+specs+'"><input type="text" task_id="'+task.cid+'" value="'+task.get("title")+'"></div>';
		});
		$("#list").html(final_output.join("\r"));
		if(first){
			$(".task:first input").focus();
			var tempval = $(".task:first input").val();
			$(".task:first input").val("");
			$(".task:first input").val(tempval);
			first = false;
		}
	},
	save_n_store : function(e){
		if($(e.currentTarget).attr("task_id") === "0"){
			var task = new Task({
				title : $(e.currentTarget).val(),
				sub : (this.is.subtasked)?true:false,
				fin : false
			});
			$(e.currentTarget).attr("task_id",task.cid);
			if($(e.currentTarget).parent().index() === 0){
				task.set({pos:0});
				this.taskColl.add(task);
			}else{
				task.set({pos:$(e.currentTarget).parent().index()});
				this.taskColl.add(task,{at:$(e.currentTarget).parent().index()});
				task.save();
				var start_num = parseInt($(e.currentTarget).parent().index());
				this.taskColl.each(function(next_task){
					var cur_num = next_task.get("pos");
					if(start_num <= cur_num && task.cid !== next_task.cid){
						console.log("setting old task "+next_task.get("title")+" to: "+parseInt(cur_num+1));
						next_task.set({pos:cur_num+1});
						next_task.save();
					}
				});
			}
			task.save();
		}else if($(e.currentTarget).attr("task_id") !== "0"){
			var task = this.taskColl.get($(e.currentTarget).attr("task_id"));
			task.set({
				title : $(e.currentTarget).val(),
				sub : ($(e.currentTarget).parent().hasClass("subtask"))?true:false,
				fin : ($(e.currentTarget).parent().hasClass("finished"))?true:false
			});
			this.taskColl.set(task,{at:$(e.currentTarget).parent().index(),remove:false});
			task.save();
		}
	},
	enter_control : function(e){
		//shift is not pressed
		if(!this.is.shift_down){
			//check for task content
			if($(e.currentTarget).val() !== ""){
				//capitalize our first letter
				$(e.currentTarget).val($(e.currentTarget).val().charAt(0).toUpperCase() + $(e.currentTarget).val().slice(1));
				this.save_n_store(e);
				if(!this.is.subtasked){
					$(e.currentTarget).parent().after('<div class="task"><input type="text" task_id="0"></div>');
				}else{
					$(e.currentTarget).parent().after('<div class="task subtask"><input type="text" task_id="0"></div>');
				}
				//focus on next input area
				$(e.currentTarget).parent().next().find("input").focus();
			}else{
				//notify that task content is necessary
				$("#msg").text("Enter content for task before moving on");
			}
		
		//shift is pressed as well
		}else if(this.is.shift_down){
			//check to see if we're finishing a parent task with child tasks, finish all if so
			if(!$(e.currentTarget).parent().hasClass("subtask") && $(e.currentTarget).parent().next().hasClass("subtask")){
				if($(e.currentTarget).parent().hasClass("finished")){
					$(e.currentTarget).parent().removeClass("finished");
				}else{
					$(e.currentTarget).parent().addClass("finished");
				}
				var next_task = $(e.currentTarget).parent().next();
				while(next_task.hasClass("subtask")){
					if(next_task.hasClass("finished")){
						next_task.removeClass("finished");
					}else{
						next_task.addClass("finished");
					}
					var task = this.taskColl.get(next_task.find("input").attr("task_id"));
					task.set({
						title : next_task.find("input").val(),
						sub : (next_task.hasClass("subtask"))?true:false,
						fin : (next_task.hasClass("finished"))?true:false
					});
					task.save();
					next_task = next_task.next();
				}
			}else{
				if($(e.currentTarget).parent().hasClass("finished")){
					$(e.currentTarget).parent().removeClass("finished");
				}else{
					$(e.currentTarget).parent().addClass("finished");
				}
				var task = this.taskColl.get($(e.currentTarget).attr("task_id"));
				task.set({
					title : $(e.currentTarget).val(),
					sub : ($(e.currentTarget).parent().hasClass("subtask"))?true:false,
					fin : ($(e.currentTarget).parent().hasClass("finished"))?true:false
				});
				task.save();
				$(e.currentTarget).parent().next().find("input").focus();
			}
		}
	},
	tab_control : function(e){
		if($(e.currentTarget).parent().is(":first-child")){
			$("#msg").text("Subtasks must have a parent task");
		}else if(!$(e.currentTarget).parent().hasClass("subtask")){
			$(e.currentTarget).parent().addClass("subtask");
			this.is.subtasked = true;
		}else{
			$("#msg").text("Subtasks may not have sub-subtasks");
		}
	},
	backspace_control : function(e){
		if(!this.is.shift_down){
			if($(e.currentTarget).getCursorPosition() === 0 && $(e.currentTarget).parent().hasClass("subtask")){
				this.is.subtasked = false;
				$(e.currentTarget).parent().removeClass("subtask");
			}else if($(e.currentTarget).getCursorPosition() === 0 && $(".task").length > 1){
				e.preventDefault();
				$(e.currentTarget).parent().prev().find("input").focus();
				this.taskColl.get($(e.currentTarget).attr("task_id")).destroy();
				this.taskColl.remove($(e.currentTarget).attr("task_id"));
				$(e.currentTarget).parent().remove();
				
			}
		}else if(this.is.shift_down){
			e.preventDefault();
			if($(".task").length > 1 && $(e.currentTarget).parent().is(":first-child")){
				$(e.currentTarget).parent().next().find("input").focus();
				this.taskColl.get($(e.currentTarget).attr("task_id")).destroy();
				this.taskColl.remove($(e.currentTarget).attr("task_id"));
				$(e.currentTarget).parent().remove();
			}else if($(".task").length > 1){
				$(e.currentTarget).parent().prev().find("input").focus();
				this.taskColl.get($(e.currentTarget).attr("task_id")).destroy();
				this.taskColl.remove($(e.currentTarget).attr("task_id"));
				$(e.currentTarget).parent().remove();
			}else{
				$(e.currentTarget).val("");
			}
		}
	},
	arrow_control : function(e){
		//up key pressed
		if(e.keyCode === 38){
			$(e.currentTarget).parent().prev().find("input").focus();	
		//down key pressed
		}else if(e.keyCode === 40){
			$(e.currentTarget).parent().next().find("input").focus();
		}
	},
	shift_control : function(e,is_pressed){
		if(is_pressed){
			this.is.shift_down = true;
		}else{
			this.is.shift_down = false;
		}
	}
	
});

//site initialization
var dtask = dtask || {
	init: function(){
		_.templateSettings = {interpolate : /\{\{(.+?)\}\}/g};
		this.listview = new ListView();
  	}
};

dtask.init();
Backbone.history.start();

//head end 
});
 
// load scripts by assigning a label for them
head.js(
	{jquery: "http://ajax.googleapis.com/ajax/libs/jquery/1.10.2/jquery.min.js"},
	{jqueryui: "http://ajax.googleapis.com/ajax/libs/jqueryui/1.10.3/jquery-ui.min.js"},
	{jq_getcursorpos: "assets/js/lib/jquery.getcursorpos.js"},
	{underscore: "assets/js/lib/underscore.min.js"},
	{backbone: "assets/js/lib/backbone.min.js"},
	{backbone: "assets/js/lib/backbone.localstorage.min.js"}
);
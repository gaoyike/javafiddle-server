Oo.future(function() {
	jf = {};
	var localServer = function() {
		return 'http://localhost:' + (jf.port || '8020');
	}
	var path = window.location.pathname + '/'
	var slashIndex = path.indexOf('/');
	jf.projectId = path.substring(slashIndex + 1, path.indexOf('/', slashIndex + 1));
	
	new Oo.XHR().open('POST', localServer() + '/' + jf.projectId).send();
	
	jf.classes = [];
	jf.libs = [];
	new Oo.XHR().open('GET', '/' + jf.projectId + '/class').send().onSuccess(function(xhr) {
		var split = xhr.data.split('\0');
		for (var i = 0; i < split.length - 1; i = i + 2) {
			jf.classes.push({"name": split[i], "src": split[i + 1]});
			jf.addClass(split[i], split[i + 1], true);
		}
	});
	new Oo.XHR().open('GET', '/' + jf.projectId + '/lib').send().onSuccess(function(xhr) {
		var split = xhr.data.split('\0');
		for (var i = 0; i < split.length - 1; i = i + 2) {
			jf.libs.push({"name": split[i], "url": split[i + 1]});
			jf.addLib(split[i], split[i + 1], true);
		}
	});
	
	jf.messages = [];
	Oo.XHR.onError(function(xhr) {
		jf.messages.push(xhr.data);
	});
	
	jf.addClass = function(name, src, skipServer) {
		if (!skipServer) {
			jf.removeClass(name, true);
			new Oo.XHR().open('POST', '/' + jf.projectId + '/class/' + name).send().onSuccess(function(xhr) {
				jf.classes.push({name: name, src: xhr.data});			
			});
		}
		new Oo.XHR().open('POST', localServer() + '/' + jf.projectId + '/class/' + name).send(src);
	};	
	
	jf.removeClass = function(name, skipPrompt) {
		if (skipPrompt || confirm('Delete ' + name)) {
			for (var i = 0; i < jf.classes.length; i++) {
				if (jf.classes[i].name === name) {
					new Oo.XHR().open('DELETE', '/' + jf.projectId + '/class/' + name).send().onSuccess(function(xhr) {
						jf.classes.splice(i, 1);
					});
					new Oo.XHR().open('DELETE', localServer() + '/' + jf.projectId + '/class/' + name).send();
					break;
				}
			}
		}
	};
	
	var prevName;
	var delay = 1000, timeout, lastUpdate = 0, updatingData;
	jf.updateClass = function(name, src) {
		if (prevName === name) {
			if ((Date.now() - lastUpdate) < 3000) {
				clearTimeout(timeout);
			} else {
				lastUpdate = Date.now();
			}
			updatingData = [name, src];
			timeout = setTimeout(function() {
				jf.sendUpdateClass(name, src);
				lastUpdate = Date.now();
				updatingData = null;
			}, delay);
		} else {
			prevName = name;
		}
	};
	
	window.onbeforeunload = function(e) {
		var data = updatingData
        if (data) {
        	jf.sendUpdateClass(data[0], data[1], true);
        };
    };
	
	jf.sendUpdateClass = function(name, src, sync) {
		new Oo.XHR().open('PUT', '/' + jf.projectId + '/class/' + name, !sync).send(src);
		new Oo.XHR().open('PUT', localServer() + '/' + jf.projectId + '/class/' + name, !sync).send(src);
	} 
	
	jf.addLib = function(name, url, skipServer) {
		if (!skipServer) {
			jf.removeLib(name, true);
			new Oo.XHR().open('POST', '/' + jf.projectId + '/lib/').send(name + '\0' + url).onSuccess(function(xhr) {
				jf.libs.push({name: name, url: url});
			});
		}
		new Oo.XHR().open('POST', localServer() + '/' + jf.projectId + '/lib/').send(name + '\0' + url).onSuccess(function(xhr) {
			if (xhr.data != name) {
				for (var i = 0; i < jf.libs.length; i++) {
					if (jf.libs[i].name === name) {
						jf.libs[i].version = xhr.data.substring(name.length + 1);
						break;
					}
				}
			}
		});
	};
	
	jf.removeLib = function(name, skipPrompt) {
		if (skipPrompt || confirm('Delete ' + name)) {
			for (var i = 0; i < jf.libs.length; i++) {
				if (jf.libs[i].name === name) {
					new Oo.XHR().open('DELETE', '/' + jf.projectId + '/lib/').send(name).onSuccess(function(xhr) {
						jf.libs.splice(i, 1);
					});
					new Oo.XHR().open('DELETE', localServer() + '/' + jf.projectId + '/lib/').send(name);
					break;
				}
			}
		}
	};
	
	jf.preserveLog = true;
	jf.run = function() {
		if (!jf.preserveLog) {
			jf.out = "";
			jf.err = "";
		}
		new Oo.XHR().open('POST', localServer() + '/' + jf.projectId + '/run').send().onError(function(xhr) {
			jf.err += xhr.responseText;
		});
	};
	
	jf.out = "";
	var pollOut = function() {
		new Oo.XHR().open('GET', localServer() + '/' + jf.projectId + '/out').send().onSuccess(function(xhr) {
			jf.out += xhr.responseText;
			pollOut();
		});
	};
	pollOut();
	jf.err = "";
	var pollErr = function() {
		new Oo.XHR().open('GET', localServer() + '/' + jf.projectId + '/err').send().onSuccess(function(xhr) {
			jf.err += xhr.responseText;
			pollErr();
		});
	};
	pollErr();
	
//	jf.err
});var editor = function(elem) {
	return {
		root: elem,
		src: "",
		line: 0,
		pos: 0,
		currElem: function() {
			return window.getSelection().focusNode && window.getSelection().focusNode.parentNode && 
				window.getSelection().focusNode.parentNode.parentNode === this.root && window.getSelection().focusNode.parentNode || 
				this.lastFocus;
		},
		currPos: function() {
			return window.getSelection().getRangeAt(0).startOffset;
		},
		newElem: function(currElem, tag) {
			var el = document.elem(tag ? tag : 'span', this.root, currElem || this.currElem());
			this.lastFocus = el;
			return el;
		},
		newLine: function() {
			return this.newElem(null, 'div');
		},
		setFocus: function(elem, pos) {
			console.log('setfocus', elem, pos);
			var sel = window.getSelection();
			var r = document.createRange();
//			r.selectNode(elem.firstChild);
			r.setStart(elem.firstChild || elem, pos);
			r.setEnd(elem.firstChild || elem, pos);
//			r.collapse();
			sel.removeAllRanges();
			sel.addRange(r);
			this.lastFocus = elem;
			this.lastPos = pos;
		},
		init: function() {
			this.newElem().innerHTML = "\r";
			var _this = this;
			this.root.on('keydown', function() {
				_this.lastFocus = _this.currElem();
				_this.lastPos = _this.currPos();
			});
			this.root.on('focus', function(e) {
				console.log(window.getSelection().focusNode);
				_this.setFocus(_this.lastFocus, _this.lastPos);
				e.preventDefault();
				e.stopPropagation();
			});
			this.root.on('keypress', function(e) {
				var c = e.keyCode;
				var el = _this.currElem();
				if ((c === 13 || c <= 47 || (c >= 58 && c <= 64)) && !el.attr('hasqoute')) {
					if (el.tagName !== 'I') {
						_this.syntaxCheck(el);
						if (c === 13) {
							el = _this.newElem(el, 'br');
						}
						var newEl = _this.newElem(el, 'i');
						newEl.innerHTML = String.fromCharCode(c);
						newEl.addClass("p");
						setTimeout(function() {
							_this.setFocus(newEl, 1);
						}, 100);
						e.preventDefault();
						e.stopPropagation();
					}
				} else {
					if (el.tagName === 'I') {
						console.log(el.innerText);
						if (el.innerHTML === '\r' || el.innerHTML === '\n') el.innerHTML = "";
						_this.syntaxCheck(el);
						var newEl = _this.newElem(el, 'span');
						newEl.innerHTML = String.fromCharCode(c);
						newEl.addClass("w");
						setTimeout(function() {
							_this.setFocus(newEl, 1);
						}, 1);
						e.preventDefault();
						e.stopPropagation();						
					}
				}
			});
			return this;
		},
		lastFocus: null,
		lastPos: 0,
		syntaxCheck: function(elem) {
			var color = this.reservedWords[elem.innerHTML];
			if (color) elem.style.color = color;
		},
		reservedWords: {'for': 'red'},
		type: function(ch, meta, ctrl, alt) {
			if (this.currElem == null || this.currElem.tagName.toLowerCase() !== 'span') {
				this.newToken();
			}
			str = this.currElem.innerHTML;
			if (meta) {
				if (ch === 68) {//meta+D
					this.deleteLine();
				}
			} else if (ch === 8) {//backspace
				if (this.pos === 0) {
					this.deleteLine();
				}
				this.currElem.innerHTML = str.substring(0, this.pos - 1) + str.substring(this.pos, str.length);
				this.pos--;
			} else if (ch === 46) {//delete
				this.currElem.innerHTML = str.substring(0, this.pos) + str.substring(this.pos + 1, str.length);
			} else if (ch === 13) {//enter
				this.currElem = Oo('div')[0];
				this.root.appendChild(this.currElem);
				this.pos = 0;
				this.line++;
				this.type(27);
			} else if (ch === 37) {//left
				this.pos = Math.max(this.pos - 1, 0);
			} else if (ch === 38) {//up
				this.line = Math.max(this.line - 1, 0);
				this.currElem = this.root.childNodes[this.line];
				this.pos = Math.min(this.pos, this.currElem.innerHTML.length);
			} else if (ch === 39) {//right
				this.pos = Math.min(this.pos + 1, this.currElem.innerHTML.length);
			} else if (ch === 40) {//down
				this.line = Math.min(this.line + 1, this.root.childNodes.length - 1);
				this.currElem = this.root.childNodes[this.line];
				this.pos = Math.min(this.pos, this.currElem.innerHTML.length);
			} else {
				this.currElem.innerHTML = str.substring(0, this.pos) + String.fromCharCode(ch) + str.substring(this.pos, str.length);
				this.pos++;
			}
            var range = document.createRange();
//	        range.setStartAfter(this.currElem);
	        range.setStart(this.currElem.firstChild, this.pos);
	        range.setEnd(this.currElem.firstChild, this.pos);
	        console.log(this.currElem.innerHTML, this.line, this.pos);
//            range.setEndBefore(this.currElem);
            
	        window.getSelection().removeAllRanges();
	        window.getSelection().addRange(range);
	        
//	        range.move('character', this.pos);
//	        range.select();
		}, 
		deleteLine: function() {
			this.root.removeChild(this.root.childNodes[this.line]);
		}
	};
}

new $cheeta.Directive('editor.').onAttach(function(elem, attrName, parentModels) {
	this.resolveModelNames(elem, attrName, parentModels);
	elem.__editor_ = new editor(elem).init();
	$cheeta(elem).attr("contentEditable", "true");
	$cheeta(elem).on("paste change keypress", function(e) {
	});
	
//	$cheeta(elem).on("keydown", function(e) {
//		var c = e.keyCode;
//		if (c == 8) {
//			e.preventDefault();
//			e.stopPropagation();
//			e.target.__editor_.type(e.keyCode, e.metaKey);
//		}
//		console.log(e.keyCode);
//	});
//	$cheeta(elem).on("keypress", function(e) {
//		e.preventDefault();
//		e.stopPropagation();
//		e.target.__editor_.type(e.keyCode);
//	});
//	
	setTimeout(function() {
		var _tmp__editor_fn__ = function() {
			return editor.src;
		};
//		eval(elem.getAttribute(attrName) + '=_tmp__editor_fn__()');
	}, 0);

});

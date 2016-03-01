'use strict'
var fmt = require('util').format
var fs = require('fs')
var path = require('path')
var _ = require('underscore')

var init = require('./init')
var AV = require('leanengine')
var request = require('superagent')
var osmosis = require('osmosis')
var colors = require('colors')
var config ={
    tagList:[{
        "id": "list_3",
        "name": "JavaScript"
    }]
}

// object
var Conf = AV.Object.extend('Conf')
var Test = AV.Object.extend('Test')
var Article = AV.Object.extend('Article')

var qyTest = new AV.Query(Test)

//var _stream = fs.createWriteStream('../log/jb.js', {
//	flags: 'a',
//	encoding: 'utf-8'
//})

function _log(content){
	//_stream.write(content)
}

process.on('uncaughtException', function (err) {
  console.log('--', index, err)
});

/**
 * fing article by id in leancloud	
 */
function findArticleById(id, callback){
	var queryAt = new AV.Query('Article')
	//console.log('id:' + id);
	queryAt.equalTo("article_id", id)

	queryAt.find({
	    success: function(results) {
	    	if(results.length > 0){
	    		console.log('存在', id, results.length)
	    		callback && callback(true)
	    	}else{
				callback && callback(false)
	    	}
	    },
	    error: function(error) {
	        callback && callback(false)
	    }
	})
}

/**
 * post article 到 avoscloud	
 */
function postArticle (params, callback){
    var at = new Article()

    if(!params.id) return

    var ar_id = params.id
    //console.log(params);
    findArticleById(ar_id, function(flag){
        //console.log('flag:'+flag);
    	if(flag) return;
		// 设置数据
        at.set('article_id', ar_id)
	    at.set('article_date', params.date)
	    at.set('article_url', params.url);
        at.set('article_title',params.title);
	    at.set('article_tag_id', params.tag.id)
	    at.set('article_tag_name', params.tag.name)

        //console.log(at);
	    at.save().then(function (obj) {
		  //对象保存成功
		   console.log(obj)
		}, function (error) {
		  //对象保存失败，处理 error
           console.log(error);
		  //_log(error)
		}).always(function(){
		  //无论成功还是失败，都调用到这里
		  callback && callback('done')
		})    	
    })

}
/**
 * 获取列表数据
 */
var _num = 0
function getListFromUrl(url, cbData, cbDone){
	//console.log('get url:', url)
	osmosis
	.config({
		tries: 1,
		timeout: 10 * 60 * 1000,
		concurrency: 1
	})
	.get(url)	// 列表页url
	.find('.newslist > dl > dt')
	.set({
		'date': 'span',		// 发布日期
		'url': 'a@href',    // 跳转url
		'id': 'a@href',	    // 文章id 列表地址
        'title':'a'   // 列表内容
	})
    .paginate('a@href')
    .find('#art_con')
    .set({
        'art_title': 'h1',		// 发布日期
        'art_content': '#art_content'     // 跳转url

    })
	.data(function (listing){
		_num++
		cbData && cbData(listing)	// 返回数据
        console.log(listing);
		//console.log(colors.yellow.underline(_num), colors.yellow(listing.id))
		//_log(fmt(_num + listing.id + '\n'))
	})
	.done(function(s){
		cbDone && cbDone()	// 一次爬虫完毕
	})
	.error(function(err){
            console.log(err);
		//_log(fmt(err))
	})
}
/**
 * delay 	
 */
function getPageDelay(base, page, ctag, callback){
	var url = base + '_' + page + '.htm';

	getListFromUrl(url, function (data){
        data = formatListId(data);
        data.tag = ctag;
		postArticle(data)	// 写入avos
	},function(){

//		page += 25
//		console.log(index, page)
//		if(page > 925){
//			callback && callback()
//			return
//		}
//		setTimeout(function(){
//			getPageDelay(base, page, ctag, callback)
//		}, 3000)
	})
}

function formatListId(data){
    var result = {}
    var id = data.id.split('/')[2].split('.')[0];
    data.id = id;
    result = data;
    return result;
}

var index = 1
function getPageFormTag(){
	var tag = config.tagList[0]
	var tid = tag.id === 'newest' ? '' : tag.id
	var tname = tag.name
	var base = 'http://www.jb51.net/list/'
	
	var url = base + tid;
    getPageDelay(url,index,tag,function(){

    });
//	getPageDelay(url, 0, tag, function(){
//		index ++
//		if(index > config.tagList.length -1) return
//		getPageFormTag()
//	})
}


//spider entry
getPageFormTag()

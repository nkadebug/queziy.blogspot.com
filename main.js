let temp, pageType, prevLink, currLink, nextLink,
    htmlCache = {},
    jsonCache = {};

let idb = new Dexie('quzeiy');

idb.version(1).stores({
    items: 'id,link,title,content,published,updated,*categories,*authors',
});

window.onpopstate = function (event) {
    let url = event.state.replace('?m=1', '').replace('&m=1', '');
    console.log(event.state, url);
    $('#main').html(htmlCache[url]);
};

history.pushState(location.href, document.title, location.href);

function parseQuery(search) {
    let args = search.substring(1).split('&');
    let argsParsed = {};
    let i, arg, kvp, key, value;
    for (i = 0; i < args.length; i++) {
        arg = args[i];
        if (-1 === arg.indexOf('=')) {
            argsParsed[decodeURIComponent(arg).trim()] = true;
        } else {
            kvp = arg.split('=');
            key = decodeURIComponent(kvp[0]).trim();
            value = decodeURIComponent(kvp[1]).trim();
            argsParsed[key] = value;
        }
    }
    return argsParsed;
}

function getHtml(url, cb) {
    url = url.replace('?m=1', '').replace('&m=1', '');

    if (!htmlCache[url]) {
        console.log('getHtml', 'Fetching...', url);
        fetch(url)
            .then((res) => res.text())
            .then(function (resp) {
                htmlCache[url] = $(resp).filter('#main').html();
                if (typeof cb == 'function') cb(htmlCache[url]);
            });
    } else {
        console.log('getHtml', 'Cached', url);
        if (typeof (cb) == 'function') cb(htmlCache[url]);
    }
}

function showHtml(url, title) {
    url = url.replace('?m=1', '').replace('&m=1', '');
    $('#overlay, #loading').show();
    getHtml(url, function (htm) {
        history.pushState(url, title, url);
        $('#main').html(htm);
        $('#overlay, #loading').hide();
    });
}

function getJson(url, cb) {
    if (!jsonCache[url]) {
        console.log('getJson', 'Fetching...', url);
        fetch(url)
            .then((res) => res.json())
            .then(function (resp) {
                jsonCache[url] = resp;
                if (typeof (cb) == "function") cb(resp);
            });
    } else {
        console.log('getJson', 'Cached', url);
        if (typeof (cb) == "function") cb(jsonCache[url]);
    }
}

function getItemByLink(link, cb) {
    idb.items
        .where({
            link,
        })
        .first(cb);
}

function getItemById(type, id, refresh, cb) {
    if (refresh) {
        getItemFromServer(type, id, cb);
    } else {
        let itemId = `tag:blogger.com,1999:blog-2922968119760916210.${type}-${id}`;
        idb.items.get(itemId).then(function (item) {
            if (item) {
                if (typeof (cb) == "function") cb(item);
            } else {
                getItemFromServer(type, id, cb);
            }
        });
    }
}

function getItemFromServer(type, id, cb) {
    let url = `${location.origin}/feeds/${type}s/default/${id}?alt=json`;
    fetch(url)
        .then((res) => res.json())
        .then(function (json) {
            let entry = json.entry;
            if (entry) {
                saveItem(entry, cb);
            } else {
                if (typeof (cb) == "function") cb(null);
            }
        });
}

function saveItem(entry, cb) {
    let item = {};
    for (let k in entry) {
        if (k == 'author') {
            item.authors = entry.author.map((a) => {
                return {
                    email: a.email.$t,
                    name: a.name.$t,
                    image: a.gd$image.src,
                };
            });
        } else if (k == 'category') {
            item.categories = entry.category.map((a) => a.term);
        } else if (k == 'link') {
            let alternateLink = entry.link.filter((a) => a.rel == 'alternate')[0];
            item.link = alternateLink ? alternateLink.href : null;
        } else {
            if (entry[k].$t) {
                item[k] = entry[k].$t;
            }
        }
    }
    idb.items.put(item);
    if (typeof (cb) == "function") cb(item);
}

function showItem(item) {
    console.log(item);
}

function activateQuestion() {
    $('.post-body > .question-container:not([activated])').each(function (i, q) {
        $(q)
            .find('.option')
            .on('click', function (e) {
                let o = e.target;
                if (!$(q).attr('attempted')) {
                    $(q).find('.solution').show();
                    if ($(o).attr('correct') == '1') {
                        $(o).addClass('bg-success');
                        $(q).find('.answer').hide();
                    } else {
                        $(o).addClass('bg-danger');
                    }
                    $(o).addClass('text-light');
                    $(q).attr('attempted', 'true');
                }
            });
        $(q).attr('activated', 'true');
    });
}
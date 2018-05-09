const cheerio = require('cheerio');
const axios = require('axios');
const express = require('express');
const Rss = require('rss');
const cache = require('memory-cache');
const winston = require('winston');

winston.configure({
    transports: [
        new (winston.transports.Console)({
            level: 'debug',
        }),
    ],
});

const app = express();

function pageToRss(content) {
    const $ = cheerio.load(content);

    const repos = [];

    $('ol.repo-list li').each((i, elem) => {
        const title = $($(elem).find('a')[0]).attr('href');
        const link = `https://github.com${title}`;
        const description = $($(elem).find('p')[0]).text().replace(/\n/g, ' ').trim();
        repos.push({
            title,
            link,
            description,
        });
    });

    const feed = new Rss({
        title: 'GitHub Trending',
        link: 'http://github-trending-to-rss-github-trending-to-rss.7e14.starter-us-west-2.openshiftapps.com/rss',
        description: 'GitHub Trending, daily, forall languages - https://github.com/trending',
        feed_url: 'http://github-trending-to-rss-github-trending-to-rss.7e14.starter-us-west-2.openshiftapps.com/rss',
        site_url: 'https://github.com/trending',
    });

    repos.forEach((r) => {
        feed.item(r);
    });

    return {
        repos,
        rss: feed.xml(),
    };
}

app.get('/rss', (req, res) => {
    const cached = cache.get('https://github.com/trending');
    if (cached != null) {
        winston.info('hit cache');
        res.set('Content-Type', 'application/xml').send(cached.rss);
        return;
    }

    axios.get('https://github.com/trending').then((response) => {
        const bodyText = response.data;
        const parsed = pageToRss(bodyText);

        cache.put('https://github.com/trending', parsed, 5 * 1000);

        res.set('Content-Type', 'application/xml').send(parsed.rss);
    }).catch((error) => {
        winston.info('error getting / parsing source page');
        winston.info(error);
        res.status(502).send('error getting / parsing source page');
    });
});

app.listen(8080, () => {
    winston.info('server listening on port 8080');
});

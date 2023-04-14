/**
 * Copyright (C) 2017 Cesar Capillas
 * Copyright (C) 2016 - 2020 Order of the Bee
 *
 * This file is part of OOTBee Support Tools
 *
 * OOTBee Support Tools is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * OOTBee Support Tools is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with OOTBee Support Tools. If not, see <http://www.gnu.org/licenses/>.
 */
/*
 * Linked to Alfresco
 * Copyright (C) 2005 - 2020 Alfresco Software Limited.
 */
function buildPropertyGetter(ctxt)
{
    var globalProperties, placeholderHelper, propertyGetter;

    globalProperties = ctxt.getBean('global-properties', Packages.java.util.Properties);
    placeholderHelper = new Packages.org.springframework.util.PropertyPlaceholderHelper('${', '}', ':', true);

    propertyGetter = function(propertyName, defaultValue)
    {
        var propertyValue;

        propertyValue = globalProperties[propertyName];
        if (propertyValue)
        {
            propertyValue = placeholderHelper.replacePlaceholders(propertyValue, globalProperties);
        }

        // native JS strings are always preferrable
        if (propertyValue !== undefined && propertyValue !== null)
        {
            propertyValue = String(propertyValue);
        }
        else if (defaultValue !== undefined)
        {
            propertyValue = defaultValue;
        }

        return propertyValue;
    };

    return propertyGetter;
}

/* exported loadSolrSummaryAndStatus */
function loadSolrSummaryAndStatus()
{
    var ctxt, propertyGetter, indexSubsystem, solrContextFactory, solrContext, solrAdminClient, args, trackingSummaryResponse, trackingSummary, trackingStatusResponse, trackingStatus, coreNames;

    ctxt = Packages.org.springframework.web.context.ContextLoader.getCurrentWebApplicationContext();
    propertyGetter = buildPropertyGetter(ctxt);
    indexSubsystem = propertyGetter('index.subsystem.name');

    if (/^solr([46])?$/.test(indexSubsystem))
    {
        model.solrSubsystemEnabled = true;

        solrContextFactory = ctxt.getBean(indexSubsystem, Packages.org.alfresco.repo.search.impl.solr.SolrChildApplicationContextFactory);
        solrContext = solrContextFactory.getApplicationContext();
        solrAdminClient = solrContext
                .getBean('search.solrAdminHTTPCLient', Packages.org.alfresco.repo.search.impl.solr.SolrAdminHTTPClient);

        args = new Packages.java.util.HashMap();

        args.action = 'SUMMARY';
        args.wt = 'json';
        trackingSummaryResponse = solrAdminClient.execute(args);

        args.action = 'STATUS';
        trackingStatusResponse = solrAdminClient.execute(args);

        trackingSummary = JSON.parse(trackingSummaryResponse).Summary;
        trackingStatus = JSON.parse(trackingStatusResponse).status;

        model.trackingSummary = trackingSummary;
        model.trackingStatus = trackingStatus;
        
        coreNames = Object.keys(trackingSummary);
        coreNames.sort(function(a, b){
            return a.localeCompare(b);
        });
        model.coreNames = coreNames;

        if (/^solr([6])?$/.test(indexSubsystem)) {

			model.cascadeTracker = [];

            for (var i in coreNames) {
                if (i) {
                    var solrHttpClientFactory = solrContext.getBean('solrHttpClientFactory', Packages.org.alfresco.httpclient.HttpClientFactory);
                    var getMethod =
                        new Packages.org.apache.commons.httpclient.methods.GetMethod(
                            solrHttpClientFactory.getHttpClient().getHostConfiguration().getHostURL() +
                            '/solr/' + coreNames[i] + '/select?' +
                            '?fl=' + encodeURIComponent('*,[cached]') +
                            '&q=' + encodeURIComponent('{!term f=int@s_@cascade}1') +
                            '&wt=json');
                    solrHttpClientFactory.getHttpClient().executeMethod(getMethod);
                    model.cascadeTracker[coreNames[i]] = JSON.parse(getMethod.getResponseBodyAsString()).response;
                }
            }

        }

    }
    else
    {
        model.solrSubsystemEnabled = false;
    }
}

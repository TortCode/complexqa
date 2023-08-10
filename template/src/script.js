// ---------------------------------------------------------
// Global
// ---------------------------------------------------------

var page_num_set = new Set();
let strategy = '';
let developer_mode = false;

// ---------------------------------------------------------
// Create jQuery elements
// ---------------------------------------------------------

var submit = $('#submitButton');

// list of text/offset objects 
const events_data = JSON.parse($('#events-data').text().trim());
const relations_data = JSON.parse($('#relations-data').text().trim());
const strategyB_tuples = [["road_ied_8-E1", "road_ied_8-E2", "road_ied_8-E3"]];//JSON.parse($('#strategyB-tuples').text().trim());

const empty_template_map = function () {
    return $('<div class="template-map">');
}

const save_record = {
    A: {
        relations: relations_data,
        qapairs: [],
    },
    B: {
        qapairs: [],
    },
};

const strategyA_template = function (tno, event1, event2) {
    return {
        question: '',
        answer: '',
    }
}

const template_record = [];
events_data.forEach(function (ei, i) {
    template_record[i] = empty_template_map();
    events_data.forEach(function (ej, j) {
        if (i >= j) return;

        for (let tno = 1; tno <= 4; tno++){
            {
                const { question, answer } = strategyA_template(tno, ei, ej);
                save_record.A.qapairs.push({
                    event1_id: ei.event_id,
                    event2_id: ej.event_id,
                    templateno: tno,
                    question,
                    answer,
                });
            }
            {
                const { question, answer } = strategyA_template(tno, ej, ei);
                save_record.A.qapairs.push({
                    event1_id: ej.event_id,
                    event2_id: ei.event_id,
                    templateno: tno,
                    question,
                    answer,
                });
            }
        }
    });
});

function strategyB_template(event1_id, event2_id, event3_id) {
    const question = 'What is the participant in the event that interviews the transporter that flew the place that gone off the explosive device. ';
    const answer = '';
    return {
        question, answer
    };
}

strategyB_tuples.forEach(function (tuple, i) {
    const { question, answer } = strategyB_template(tuple[0], tuple[1], tuple[2]);
    save_record.B.qapairs.push({
        event1_id: tuple[0],
        event2_id: tuple[1],
        event3_id: tuple[2],
        question,
        answer,
    });
});

// implementation of string formatting
if (!String.prototype.format) {
    String.prototype.format = function () {
        var args = arguments;
        return this.replace(/{(\d+)}/g, function (match, number) {
            return typeof args[number] != 'undefined'
                ? args[number]
                : match
                ;
        });
    };
}

// ---------------------------------------------------------
// Create elements
// ---------------------------------------------------------

var makeDom = function () {
    recoverUserInput();
    console.log(page_num_set);
    highlightEvent();
};

var highlightEvent = function () {
    /* highlight trigger within document */
    const pagenos = Array.from(page_num_set);
    pagenos.sort((a, b) => events_data[a].offset - events_data[b].offset);

    // remove previous highlights
    $('trigger').removeClass('highlight-trigger');
    $('role').removeClass('highlight-role1 highlight-role2 highlight-role3');

    pagenos.forEach(trigger_num => {
        // highlight trigger
        $('#trigger-' + trigger_num).addClass('highlight-trigger');
        $('role[trigno=' + trigger_num + ']').addClass('highlight-role'+(trigger_num+1));
    })
}

const relationTypes = [
    "BEFORE",
    "AFTER",
    "OVERLAPS",
    "EQUAL",
    "CONTAINS",
    "CONTAINED BY",
    "CAUSES",
    "CAUSED BY",
]

// restore input from other trigger
var recoverUserInput = function () {
    const inputArea = $('#input-area');
    inputArea.empty();
    page_num_set.clear();

    let pagenos = [];
    if (strategy === 'A') {
        // questions
        const event_pair = $('#tuple-select').val().split(',').map(x => parseInt(x));
        page_num_set.add(event_pair[0]);
        page_num_set.add(event_pair[1]);

        pagenos = event_pair;
        pagenos.sort((a, b) => events_data[a].offset - events_data[b].offset);

        // relations
        const relationsArea = $('#relations-area');
        relationsArea.empty();
        pagenos.forEach(i => {
            pagenos.forEach(j => {
                if (i >= j) return;

                const event1 = events_data[i];
                const event2 = events_data[j];
                relationsArea.append(makeRelationSelect(event1, event2));
                relationsArea.append(makeRelationSelect(event2, event1));
            })
        })

        const matching_pairs = save_record.A.qapairs.filter(qa => {
            return (
                (qa.event1_id === events_data[event_pair[0]].event_id &&
                qa.event2_id === events_data[event_pair[1]].event_id) ||
                (qa.event1_id === events_data[event_pair[1]].event_id &&
                qa.event2_id === events_data[event_pair[0]].event_id)
            );
        });
        matching_pairs.forEach((qa, i) => {
            add_qa_input(qa.question, qa.answer, qa);
            if (i % 2 === 1 && i < matching_pairs.length - 1)
                inputArea.add($('<hr>'));
        });
    } else if (strategy === 'B') {
        const tuple = save_record.B.qapairs[$('#tuple-select').val()];
        console.log("TUPLE", tuple)
        page_num_set.add(events_data.findIndex(e => e.event_id === tuple.event1_id));
        page_num_set.add(events_data.findIndex(e => e.event_id === tuple.event2_id));
        page_num_set.add(events_data.findIndex(e => e.event_id === tuple.event3_id));
        pagenos = Array.from(page_num_set);
        pagenos.sort((a, b) => events_data[a].offset - events_data[b].offset);
        add_qa_input(tuple.question, tuple.answer, null, false);
        add_qa_input('', '', tuple, true);
    }
    // templates
    const templateArea = $('#template-area');
    templateArea.empty()
    pagenos.forEach(trigger_num => {
        const div = $('<div>')
            .append($('<p>').text(describeEvent(events_data[trigger_num])))
            .append(template_record[trigger_num]);
        templateArea.append(div);
    });
};

function describeEvent(event) {
    return (developer_mode ? `ID: ${event.event_id} | ` : "") + `${event.text} @ ${event.offset}`;
}

function makeRelationSelect(event1, event2) {
    const id1 = event1.event_id;
    const id2 = event2.event_id;
    const relation = relations_data.find(r =>
        r.event1_id == id1 &&
        r.event2_id == id2
    );

    const selectInput =
        $('<select class="relation-select mg-5">');
    relationTypes.forEach(type => {
        const option = $(`<option value="${type}">${type.toLowerCase()}</option>`);
        selectInput.append(option);
    });
    selectInput.append($('<option value="NONE">none</option>'));
    selectInput.val(relation?.type ?? "NONE");
    selectInput.on('change', function () {
        const type = $(this).val();
        const event1_id = id1;
        const event2_id = id2;
        const relation = relations_data.find(r =>
            r.event1_id == event1_id &&
            r.event2_id == event2_id
        );
        if (relation) {
            relation.type = type;
        } else {
            relations_data.push({
                event1_id,
                event2_id,
                type,
            });
        }
    });

    const div = $('<div>')
        .append($('<label>').text(describeEvent(event1)))
        .append(selectInput)
        .append($('<label>').text(describeEvent(event2)))

    return div;
}

// ensure something is in the input box
var canSubmit = function () {
    return true;
};

// template role fields
const make_role_mapping_element = function (role, text) {
    const role_text = $('<label>').html('<b>' + role + '</b>:');
    const role_field = $('<span>')
        .addClass('role-field')
        .attr({
            role: role,
            rows: 1,
        })
        .text(text)

    const role_div = $('<div>')
        .addClass('role-container')
        .append(role_text)
        .append(role_field);

    return role_div;
}


const add_qa_input = function (question = '', answer = '', ref = null, editable = true) {
    let question_text = $('<label>').text('question:');
    let question_input = $('<textarea>')
        .addClass('question-input')
        .addClass('mg-15')
        .attr({
            placeholder: 'write down your question',
            rows: 2,
            cols: 80,
        })
        .text(question);
    question_input.on("input", function () {
        console.log('q', ref)
        if (ref != null)
            ref.question = $(this).val();
        show();
    });
    let answer_text = $('<label>').text('answer:');
    let answer_input = $('<textarea>')
        .addClass('answer-input')
        .addClass('mg-15')
        .attr({
            placeholder: 'write down your answer',
            rows: 2,
            cols: 80,
        })
        .text(answer);
    answer_input.on("input", function () {
        console.log('a', ref)
        if (ref != null)
            ref.answer = $(this).val();
        show();
    });

    if (!editable) {
        question_input.attr('disabled', 'disabled');
        answer_input.attr('disabled', 'disabled');
    }

    const input_fields = $('<div>')
        .addClass('input-fields')
        .append(question_text)
        .append(question_input)
        .append(answer_text)
        .append(answer_input)

    $('#input-area').append(input_fields);

    show();
};

var enable_button = function (button) {
    button.removeAttr("disabled");
    button.removeClass("btn-default");
    button.addClass("btn-success");
};

var disable_button = function (button) {
    button.attr("disabled", "disabled");
    button.removeClass("btn-success");
    button.addClass("btn-default");
};

var select_button = function (button) {
    button.removeClass("btn-default");
    button.addClass("btn-primary");
};

var deselect_button = function (button) {
    button.removeClass("btn-primary");
    button.addClass("btn-default");
};

var is_wh_question = function (question) {
    let tokens = question.split(' ');
    if (tokens.length <= 1) {
        return false;
    }

    // let wh_pattern = /^Wh\|wh\|How\|how/;
    let wh_pattern = /^wh|Wh|how|How/;
    // console.log(question.match(wh_pattern));
    return !!question.match(wh_pattern);
};


var show = function () {
    for (button of document.getElementById('button-bar').getElementsByTagName('*')) {
        if (page_num_set.has(parseInt(button.getAttribute('page-no'))))
            select_button($(button));
        else
            deselect_button($(button));
    }

};

// dynamically create buttons for each SRL arg
events_data.forEach(function (event, i) {
    if (event.text.trim()) {
        var button = document.createElement("button");
        button.setAttribute("type", "button");
        button.setAttribute("id", "button-page-" + i);
        button.setAttribute("page-no", i);
        button.setAttribute("class", "btn btn-default");
        button.innerHTML = describeEvent(event);
        button.onclick = function () {
            // const pageno = parseInt(this.getAttribute("page-no"));
            // // toggle button
            // if (button.classList.contains('btn-default'))
            //     page_num_set.add(pageno);
            // else
            //     page_num_set.delete(pageno);
            // makeDom();
            // let instruction = $('#instructionBody');
            // if (instruction.is(':visible')) {
            //     instruction.toggle();
            // }
            // //window.scrollTo(0, 0); // scroll to top
            // show();
        }
        document.getElementById('button-bar').appendChild(button);
    }

    // format template area with role mappings
    // if template not null or undefined
    if (event.template !== null) {
        const template_area = template_record[i];
        const template = $('<p>').text(event.template);
        template_area.append(template);
        event.role_text_map.forEach(function (pairing) {
            template_area.append(make_role_mapping_element(pairing.role, pairing.tokens.map(tk => tk.text).join('/')));
        });
    }
})

// ---------------------------------------------------------
// Initialize
// ---------------------------------------------------------

var submit_form = function (event) {
    event.preventDefault();
    if (!window.confirm("Are you sure you want to submit?")) return;
    save_all();

    const urlParams = new URLSearchParams(window.location.search)

    // create the form element and point it to the correct endpoint
    const form = document.createElement('form')
    form.action = (new URL('mturk/externalSubmit', urlParams.get('turkSubmitTo'))).href
    form.method = 'post'

    // attach the assignmentId
    const inputAssignmentId = document.createElement('input')
    inputAssignmentId.name = 'assignmentId'
    inputAssignmentId.value = urlParams.get('assignmentId')
    inputAssignmentId.hidden = true
    form.appendChild(inputAssignmentId)

    // attach data I want to send back
    const inputResults = document.createElement('input')
    inputResults.name = 'results'
    inputResults.value = JSON.stringify(save_record)
    inputResults.hidden = true
    form.appendChild(inputResults)

    // attach the form to the HTML document and trigger submission
    document.body.appendChild(form)
    form.submit()
}

//$('#save').on('click', save_all);
submit.on('click', submit_form);

var popup_alert = function (alert_box, text) {
    alert_box.html(text);
    alert_box.css({
        'background-color': 'fec5bb',
        'padding': '5px',
        'border': '1px solid lightgray',
        'border-radius': '10px',
        'margin-top': '10px',
        'margin-bottom': '10px'
    });
    displaying = true;
    setTimeout(function () {
        alert_box.html('');
        alert_box.css({
            'padding': '0px',
            'border': '0px'
        });
        displaying = false;
    }, 7000);
};

const selectA = $('#selectA');
const selectB = $('#selectB');

const tupleSelect = $('#tuple-select');


function makeSelectionOptions() {
    if (strategy === 'A') {
        tupleSelect.empty();
        events_data.forEach(function (ei, i) {
            events_data.forEach(function (ej, j) {
                if (i >= j) return;
                const opt = $('<option>')
                    .attr({
                        value: `${i},${j}`,
                    })
                    .text(`${describeEvent(ei)} & ${describeEvent(ej)}`);
                tupleSelect.append(opt);
            });
        });
        tupleSelect.children()[0].selected = true;
    } else {
        tupleSelect.empty();
        function describeEventById(id) {
            const event = events_data.find(e => e.event_id === id);
            return describeEvent(event);
        }
        strategyB_tuples.forEach(function (tuple, i) {
            const opt = $('<option>')
                .attr({
                    value: i,
                })
                .text(`${describeEventById(tuple[0])}, ${describeEventById(tuple[1])}, ${describeEventById(tuple[2])}`);
            tupleSelect.append(opt);
        });
        tupleSelect.children()[0].selected = true;
    }
}

selectA.on('click', function () {
    if (strategy === 'A') return;
    strategy = 'A';
    $('#strategyA').show();
    select_button(selectA);
    $('#strategyB').hide();
    deselect_button(selectB);
    makeSelectionOptions();
    makeDom();
    show();
});

selectB.on('click', function () {
    if (strategy === 'B') return;
    strategy = 'B';
    $('#strategyA').hide();
    deselect_button(selectA);
    $('#strategyB').show();
    select_button(selectB);
    makeSelectionOptions();
    makeDom();
    show();
});

selectA.click();

tupleSelect.on('change', function () {
    makeDom();
    show();
});

$('#developer-mode').on('change', function () {
    developer_mode = this.checked;
    makeSelectionOptions();
    makeDom();
    show();
});

// Instructions expand/collapse
var content = $('#instructionBody');
var instructions_trigger = $('#collapseTrigger');
// content.hide();
$('.collapse-text').text('(Click to collapse)');
instructions_trigger.click(function () {
    content.toggle();
    var isVisible = content.is(':visible');
    if (isVisible) {
        $('.collapse-text').text('(Click to collapse)');
    } else {
        $('.collapse-text').text('(Click to expand)');
    }
});

console.log(save_record)
show();
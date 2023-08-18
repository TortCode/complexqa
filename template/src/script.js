// ---------------------------------------------------------
// Global
// ---------------------------------------------------------

const page_num_set = new Set();
let strategy = '';
let developer_mode = false;
let current_strategyD_window = [];

// ---------------------------------------------------------
// Create jQuery elements
// ---------------------------------------------------------

const submit = $('#submitButton');

// list of text/offset objects 
const events_data = JSON.parse($('#events-data').text().trim());
const strategy_data = JSON.parse($('#strategy-data').text().trim());

const empty_template_map = function () {
    return $('<div class="template-map">');
}

const relations_data = strategy_data.strategy_1.map(query => {
    return {
        event1_id: query.events[0].id,
        event2_id: query.events[1].id,
        type: query.relation,
    }
});

const template_record = [];
// make template areas
events_data.forEach(function (event, i) {
    template_record[i] = empty_template_map();
    // format template area with role mappings
    // if template not null or undefined
    if (event.template !== null) {
        const template_area = template_record[i];
        template_area.append($('<p>').text(event.event_type));
        template_area.append($('<p>').text(event.template));
        event.role_text_map.forEach(function (pairing) {
            pairing.tokens.forEach(function (tk) {
                template_area.append(make_role_mapping_element(pairing.role, tk.text));
            });
        });
    }
})

const save_record = {
    A: {
        relations: relations_data,
        qapairs: [],
    },
    B: {
        qapairs: [],
    },
    C: {
        qapairs: [],
    },
    D: {
        qapairs: [],
    },
};

events_data.forEach(function (ei, i) {
    strategy_data.strategy_3
    .filter(query => query.event.id == ei.event_id)
    .forEach(query => {
        save_record.C.qapairs.push({
            event_id: query.event.id,
            relation: query.relation,
            question: query.init_question,
            answer: query.expect_answer,
        });
    });
    events_data.forEach(function (ej, j) {
        if (i >= j) return;

        strategy_data.strategy_1
        .filter(query => {
            return (
                query.events[0].id === ei.event_id &&
                query.events[1].id === ej.event_id ||
                query.events[0].id === ej.event_id &&
                query.events[1].id === ei.event_id
            );
        })
        .forEach(query => {
            save_record.A.qapairs.push({
                event1_id: query.events[0].id,
                event2_id: query.events[1].id,
                relation: query.relation,
                question: query.init_question,
                answer: query.answer,
            });
        });
    });
});

strategy_data.strategy_2.forEach(function (tuple, i) {
    save_record.B.qapairs.push({
        event1_id: tuple.events[0].id,
        event2_id: tuple.events[1].id,
        event3_id: tuple.events[2].id,
        question: tuple.init_question,
        answer: tuple.expect_answer,
    });
});

const event_types = Object.keys(strategy_data.strategy_4);

// implementation of string formatting
if (!String.prototype.format) {
    String.prototype.format = function () {
        const args = arguments;
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

const makeDom = function () {
    recoverUserInput();
    console.log(page_num_set);
    highlightEvent();
};

const highlightEvent = function () {
    /* highlight trigger within document */
    const pagenos = Array.from(page_num_set);
    pagenos.sort((a, b) => events_data[a].offset - events_data[b].offset);

    // remove previous highlights
    $('trigger').removeClass('highlight-trigger');
    $('role').removeClass('highlight-role1 highlight-role2 highlight-role3');

    pagenos.forEach((trigger_num, i) => {
        console.log("highlight trigger", trigger_num)
        // highlight trigger
        $('#trigger-' + trigger_num).addClass('highlight-trigger');
        $('role[trigno=' + trigger_num + ']').addClass('highlight-role'+(i+1));
    })
}

const relationTypes = ['before', 'after', 'overlap', 'equal', 'contains'];

// restore input from other trigger
const recoverUserInput = function () {
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
        const event1 = events_data[pagenos[0]];
        const event2 = events_data[pagenos[1]];
        relationsArea.append(makeRelationSelect(event1, event2));
        relationsArea.append(makeRelationSelect(event2, event1));

        save_record.A.qapairs
        .filter(qa => {
            return (
                (qa.event1_id === events_data[event_pair[0]].event_id &&
                qa.event2_id === events_data[event_pair[1]].event_id) ||
                (qa.event1_id === events_data[event_pair[1]].event_id &&
                qa.event2_id === events_data[event_pair[0]].event_id)
            );
        })
        .forEach(qa => {
            add_qa_input(qa.question, qa.answer, qa);
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
    } else if (strategy === 'C') {
        const tuple = strategy_data.strategy_3[$('#tuple-select').val()];
        const eventIdx = events_data.findIndex(e => e.event_id === tuple.event.id);
        page_num_set.add(eventIdx);

        save_record.C.qapairs
        .filter(qa => {
            return (
                qa.event_id === tuple.event.event_id &&
                qa.relation === tuple.relation
            )
        })
        .forEach(qa => {
            add_qa_input(qa.question, qa.answer, qa);
            inputArea.append($('<hr>'));
        })
    } else if (strategy === 'D') {
        const event_type = $('#tuple-select').val();
        events_data.forEach(function (event, i) {
            if (event.event_type === event_type) {
                page_num_set.add(i);
            }
        });

        let current_strategyD_window = save_record.D.qapairs
        .filter(qa => qa.event_type === event_type);

        current_strategyD_window.forEach(qa => {
            add_qa_input(qa.question, qa.answer, qa);
            inputArea.append($('<hr>'));
        });
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
        $('<select class="relation-select">');
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
const canSubmit = function () {
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

const enable_button = function (button) {
    button.removeAttr("disabled");
    button.removeClass("btn-default");
    button.addClass("btn-success");
};

const disable_button = function (button) {
    button.attr("disabled", "disabled");
    button.removeClass("btn-success");
    button.addClass("btn-default");
};

const select_button = function (button) {
    button.removeClass("btn-default");
    button.addClass("btn-primary");
};

const deselect_button = function (button) {
    button.removeClass("btn-primary");
    button.addClass("btn-default");
};

const is_wh_question = function (question) {
    let tokens = question.split(' ');
    if (tokens.length <= 1) {
        return false;
    }

    // let wh_pattern = /^Wh\|wh\|How\|how/;
    let wh_pattern = /^wh|Wh|how|How/;
    // console.log(question.match(wh_pattern));
    return !!question.match(wh_pattern);
};


const show = function () {
    for (button of document.getElementById('button-bar').getElementsByTagName('*')) {
        if (page_num_set.has(parseInt(button.getAttribute('page-no'))))
            select_button($(button));
        else
            deselect_button($(button));
    }

};

function make_event_buttons() {
    $('#button-bar').empty();
    // dynamically create buttons for each SRL arg
    events_data.forEach(function (event, i) {
        if (event.text.trim()) {
            const button = document.createElement("button");
            button.setAttribute("type", "button");
            button.setAttribute("id", "button-page-" + i);
            button.setAttribute("page-no", i);
            button.setAttribute("class", "btn btn-default");
            button.innerHTML = describeEvent(event);
            document.getElementById('button-bar').appendChild(button);
        }
    })
}

make_event_buttons();


// ---------------------------------------------------------
// Initialize
// ---------------------------------------------------------

const submit_form = function (event) {
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

const popup_alert = function (alert_box, text) {
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

const tupleSelect = $('#tuple-select');


function makeSelectionOptions() {
    function describeEventById(id) {
        const event = events_data.find(e => e.event_id === id);
        return describeEvent(event);
    }

    tupleSelect.empty();
    if (strategy === 'A') {
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
    } else if (strategy === 'B') {
        strategy_data.strategy_2.forEach(function (tuple, i) {
            const opt = $('<option>')
                .attr({
                    value: i,
                })
                .text(`${describeEventById(tuple.events[0])}, ${describeEventById(tuple.events[1])}, ${describeEventById(tuple.events[2])}`);
            tupleSelect.append(opt);
        });
    } else if (strategy === 'C') {
        strategy_data.strategy_3.forEach(function (tuple, i) {
            const opt = $('<option>')
                .attr({
                    value: i,
                })
                .text(`${tuple.relation} ${describeEventById(tuple.event.id)}`);
            tupleSelect.append(opt);
        });
    } else if (strategy === 'D') {
        Object.keys(strategy_data.strategy_4).forEach(function (event_type) {
            const opt = $('<option>')
                .attr({
                    value: event_type,
                })
                .text(`${event_type}`);
            tupleSelect.append(opt);
        }); 
    }
    const children = tupleSelect.children();
    if (children.length > 0) {
        children[0].selected = true;
    }
}

function setStrategy(newStrategy) {
    if (strategy === newStrategy) return;
    strategy = newStrategy;
    // show correct elements
    $('.strategy').hide();
    $('#strategy'+strategy).show();
    // highlight correct buttons
    deselect_button($('#strategy-btns button'));
    select_button($('#select'+strategy));
    // update others
    makeSelectionOptions();
    makeDom();
    show();
}

$('#selectA').on('click', () => setStrategy('A'));
$('#selectB').on('click', () => setStrategy('B'));
$('#selectC').on('click', () => setStrategy('C'));
$('#selectD').on('click', () => setStrategy('D'));
$('#selectA').click();

tupleSelect.on('change', function () {
    makeDom();
    show();
});

$('#developer-mode').on('change', function () {
    developer_mode = this.checked;
    makeSelectionOptions();
    makeDom();
    make_event_buttons();
    show();
});

$('#addbtn').on('click', function () {
    if (strategy !== 'D') return;
    const event_type = $('#tuple-select').val();
    const data = {
        event_type,
        question: '',
        answer: '',
    };
    save_record.D.qapairs.push(data);
    current_strategyD_window.push(data);
    add_qa_input('', '', data);
});
$('#rmbtn').on('click', function () {
    if (strategy !== 'D') return;
    const data = current_strategyD_window.pop();
    save_record.D.qapairs.splice(save_record.D.qapairs.indexOf(data), 1);
    $('#input-area').children().last().remove();
});

// Instructions expand/collapse
const content = $('#instructionBody');
const instructions_trigger = $('#collapseTrigger');
// content.hide();
$('.collapse-text').text('(Click to collapse)');
instructions_trigger.click(function () {
    content.toggle();
    const isVisible = content.is(':visible');
    if (isVisible) {
        $('.collapse-text').text('(Click to collapse)');
    } else {
        $('.collapse-text').text('(Click to expand)');
    }
});

console.log(save_record)
show();

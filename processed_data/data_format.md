# Columns
- docid: Document Id
- text: Combined text of the document with triggers/arguments marked
- events: data for events
- relations: relations between events

# Format of event data
```
Data = [Event]

Event = {
    event_id: str (unique id for the event),
    text: str (text of the event trigger),
    offset: int (start token of trigger),
    length: int (token length of trigger),
    template: str (template of the event),
    role_text_map: RoleTextMap (map from roles to text),
}

RoleTextMap = {
    role: str (role name),
    tokens: [Token],
}

Token = {
    entity_id: str (id of entity mentioned)
    text: str (text of the argument),
    offset: int (start token of argument),
    length: int (token length of argument),
}
```
# Format of relations data
```
Data = [Relation]

Relation = (
    relation_id: str,
    event1_id: str,
    event2_id: str,
    type: str,
)
```